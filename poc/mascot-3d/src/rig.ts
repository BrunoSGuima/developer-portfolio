// The temporary rigged character and every motion the spike can give it. Motions are sampled at an
// explicit time, so a recording is deterministic and independent of the machine's frame rate.
import {
  AmbientLight,
  AnimationAction,
  AnimationMixer,
  Bone,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  LoopRepeat,
  Mesh,
  Object3D,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** How far the pelvis drops when seated, as a fraction of the standing height. */
const SEAT_DROP = 0.3;

export type ClipName =
  | 'Dance'
  | 'Death'
  | 'Idle'
  | 'Jump'
  | 'No'
  | 'Punch'
  | 'Running'
  | 'Sitting'
  | 'Standing'
  | 'ThumbsUp'
  | 'Walking'
  | 'WalkJump'
  | 'Wave'
  | 'Yes';

/** A clip at a time, with a weight: several layers are how the crossfades are made. */
export interface ClipLayer {
  clip: ClipName;
  time: number;
  weight?: number;
}

/** Everything that is not a clip: created in code, on top of the sampled clips. */
export interface Procedural {
  /** Aim an arm at a direction, index finger out. L is the viewer's right, R the viewer's left. */
  point?: { weight: number; x: number; y: number; side?: 'L' | 'R' };
  /** A real seated pose built from bones: the model's Sitting clip is only a slight dip. */
  sit?: number;
  /** Landing squash: 1 flattens, 0 is neutral. */
  squash?: number;
  /** Turn the head (radians): the subtle idle reaction. */
  look?: { yaw: number; pitch: number };
  /** Facial morph targets the model provides. */
  face?: Partial<Record<'Angry' | 'Surprised' | 'Sad', number>>;
}

export interface Pose extends Procedural {
  layers: ClipLayer[];
  /** Body turn around the vertical axis (radians): 0 faces the viewer. */
  yaw?: number;
}

const aimFrom = new Vector3();
const aimTo = new Vector3();
const delta = new Quaternion();
const parentWorld = new Quaternion();
const local = new Quaternion();

/** Rotates `bone` so the direction to `child` becomes `direction` (world space), by `weight`. */
function aimBone(bone: Object3D, child: Object3D, direction: Vector3, weight: number) {
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(aimFrom);
  child.getWorldPosition(aimTo);
  aimTo.sub(aimFrom).normalize();
  delta.setFromUnitVectors(aimTo, direction);
  bone.parent!.getWorldQuaternion(parentWorld);
  // The world rotation expressed in the parent's space, then applied before the bone's own
  local.copy(parentWorld).invert().multiply(delta).multiply(parentWorld);
  const target = bone.quaternion.clone().premultiply(local);
  bone.quaternion.slerp(target, weight);
}

export class Rig {
  readonly scene = new Scene();
  readonly root = new Object3D();
  /** Idle standing height in model units: every size in the spike is relative to this. */
  height = 1;
  feetOffset = 0;
  modelBox = { minY: 0, maxY: 0, width: 0 };
  /** Facts for the report. */
  stats = { triangles: 0, skinned: 0, bones: 0, materials: 0 };

  private mixer!: AnimationMixer;
  private actions = new Map<string, AnimationAction>();
  private bones = new Map<string, Bone>();
  private morphs: Mesh[] = [];
  private rest: { node: Object3D; position: Vector3; quaternion: Quaternion; scale: Vector3 }[] =
    [];
  private dir = new Vector3();

  async load(url = '/models/RobotExpressive.glb') {
    const gltf = await new GLTFLoader().loadAsync(url);
    this.root.add(gltf.scene);
    this.scene.add(this.root);
    this.mixer = new AnimationMixer(gltf.scene);
    const materials = new Set<unknown>();
    gltf.scene.traverse((o) => {
      if ((o as Bone).isBone) {
        this.bones.set(o.name, o as Bone);
        this.stats.bones++;
      }
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        const index = mesh.geometry.index;
        this.stats.triangles +=
          (index ? index.count : mesh.geometry.attributes['position']!.count) / 3;
        if ((mesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) this.stats.skinned++;
        materials.add(mesh.material);
        if (mesh.morphTargetDictionary) this.morphs.push(mesh);
        // The model's materials are flat and very dark in places: only lifted enough to read.
        mesh.frustumCulled = false;
      }
    });
    this.stats.materials = materials.size;
    for (const clip of gltf.animations) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      action.paused = true;
      this.actions.set(clip.name, action);
    }
    gltf.scene.traverse((node) => {
      this.rest.push({
        node,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      });
    });
    this.apply({ layers: [{ clip: 'Idle', time: 0 }] });
    this.root.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(gltf.scene, true);
    this.height = box.max.y - box.min.y;
    this.feetOffset = -box.min.y;
    this.modelBox = { minY: box.min.y, maxY: box.max.y, width: box.max.x - box.min.x };
    this.scene.add(new AmbientLight(new Color(0xffffff), 0.75));
    this.scene.add(new HemisphereLight(0xfff0e0, 0x8f6e58, 0.8));
    const key = new DirectionalLight(0xffe7cc, 2.6);
    key.position.set(4, 8, 8);
    this.scene.add(key);
    const rim = new DirectionalLight(0xffc891, 1.4);
    rim.position.set(-5, 4, -6);
    this.scene.add(rim);
    return this;
  }

  clipDuration(name: ClipName) {
    return this.actions.get(name)!.getClip().duration;
  }

  apply(pose: Pose) {
    // A clip only writes the bones it animates (Idle: 7 channels), so start every pose from rest.
    for (const { node, position, quaternion, scale } of this.rest) {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
      node.scale.copy(scale);
    }
    for (const mesh of this.morphs) mesh.morphTargetInfluences?.fill(0);
    for (const action of this.actions.values()) {
      action.enabled = false;
      action.setEffectiveWeight(0);
    }
    for (const layer of pose.layers) {
      const action = this.actions.get(layer.clip)!;
      action.enabled = true;
      action.play();
      action.paused = true;
      action.setEffectiveTimeScale(0);
      action.setEffectiveWeight(layer.weight ?? 1);
      action.time = layer.time;
    }
    this.mixer.update(0);
    this.root.rotation.y = pose.yaw ?? 0;
    this.root.position.y = this.feetOffset;
    this.applyProcedural(pose);
  }

  private bone(name: string) {
    return this.bones.get(name);
  }

  private applyProcedural(pose: Pose) {
    this.root.updateWorldMatrix(true, true);
    const squash = pose.squash ?? 0;
    this.root.scale.set(1 + squash * 0.16, 1 - squash * 0.22, 1 + squash * 0.16);

    if (pose.sit) this.applySit(pose.sit);

    if (pose.look) {
      const head = this.bone('Head');
      if (head) {
        head.rotateY(pose.look.yaw);
        head.rotateX(pose.look.pitch);
      }
    }

    if (pose.point && pose.point.weight > 0) this.applyPoint(pose.point);

    if (pose.face) {
      for (const mesh of this.morphs) {
        for (const [name, value] of Object.entries(pose.face)) {
          const i = mesh.morphTargetDictionary![name];
          if (i !== undefined) mesh.morphTargetInfluences![i] = value;
        }
      }
    }
  }

  /**
   * Thighs and shins toward the viewer, so nothing hangs below the seat. The rig's feet are not
   * children of the legs (the clips move them separately), so they are placed at the shin's end.
   */
  private applySit(weight: number) {
    const body = this.bone('Body');
    if (!body?.parent) return;
    const drop = this.height * SEAT_DROP * weight;
    const scale = body.getWorldScale(new Vector3()).y;
    const parentScale = body.parent.getWorldScale(new Vector3()).y || scale || 1;
    body.position.y -= drop / parentScale;
    this.root.updateWorldMatrix(true, true);
    const out = new Vector3(0, 0, 1);
    const down = new Vector3(0, -1, 0);
    for (const side of ['L', 'R']) {
      const upper = this.bone(`UpperLeg${side}`);
      const lower = this.bone(`LowerLeg${side}`);
      const end = lower?.children[0];
      const foot = this.bone(`Foot${side}`);
      if (!upper || !lower || !end || !foot?.parent) continue;
      const blend = (t: number) => down.clone().lerp(out, t).normalize();
      aimBone(upper, lower, blend(weight), weight);
      aimBone(lower, end, blend(weight * 0.92), weight);
      lower.updateWorldMatrix(true, true);
      end.updateWorldMatrix(true, true);
      const tip = end.getWorldPosition(new Vector3());
      foot.parent.updateWorldMatrix(true, false);
      foot.position.copy(foot.parent.worldToLocal(tip));
    }
    // The long arms would hang below the seat, over the nav label: rest the hands forward instead
    for (const side of ['L', 'R']) {
      const sign = side === 'L' ? 1 : -1;
      const upper = this.bone(`UpperArm${side}`);
      const lower = this.bone(`LowerArm${side}`);
      const palm = this.bone(`Palm2${side}`);
      if (!upper || !lower || !palm) continue;
      aimBone(upper, lower, new Vector3(sign * 0.38, -0.55, 0.75).normalize(), weight);
      aimBone(lower, palm, new Vector3(-sign * 0.12, 0.02, 1).normalize(), weight);
    }
  }

  /** Built from bones only: the model has no pointing clip (see the M1 report). */
  private applyPoint({ weight, x, y, side = 'L' }: NonNullable<Procedural['point']>) {
    const upper = this.bone(`UpperArm${side}`);
    const lower = this.bone(`LowerArm${side}`);
    const palm = this.bone(`Palm2${side}`);
    const middle = this.bone(`Middle1${side}`);
    if (!upper || !lower || !palm || !middle) return;
    this.dir.set(x, y, 0.28).normalize();
    aimBone(upper, lower, this.dir, weight);
    aimBone(lower, palm, this.dir, weight);
    aimBone(palm, middle, this.dir, weight);
    // Curl the fist; the index stays long
    for (const name of [`Middle1${side}`, `Middle2${side}`, `Ring1${side}`, `Ring2${side}`])
      this.bone(name)?.rotateX(1.35 * weight);
    for (const name of [`Thumb${side}`, `Thumb2${side}`]) this.bone(name)?.rotateX(0.7 * weight);
    const index = this.bone(`Index${side}`);
    const tip = this.bone(`Index2${side}`);
    if (index && tip) aimBone(index, tip, this.dir, weight);
  }
}
