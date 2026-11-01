// The temporary rigged character (CC0, see assets/RobotExpressive.README.md): only what the nav
// needs. Ported from the M1 spike, poc/mascot-3d/src/rig.ts.
import {
  AmbientLight,
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  type Bone,
  Box3,
  DirectionalLight,
  HemisphereLight,
  LoopRepeat,
  Object3D,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** How far the pelvis drops when seated, as a fraction of the standing height. */
const SEAT_DROP = 0.3;

export type ClipName = 'Idle' | 'Walking' | 'Running' | 'Jump';

export interface ClipLayer {
  clip: ClipName;
  time: number;
  weight?: number;
}

export interface Pose {
  layers: ClipLayer[];
  /** Body turn around the vertical axis (radians): 0 faces the viewer. */
  yaw?: number;
  /** A seated pose built from bones: the model's Sitting clip is only a slight dip. */
  sit?: number;
  /** Aims an arm from bones (the model has no pointing clip). L is the viewer's right. */
  point?: { weight: number; x: number; y: number; side: 'L' | 'R' };
  /** Head turn added over the clips, in radians. */
  look?: { yaw: number; pitch: number };
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
  bone.quaternion.slerp(bone.quaternion.clone().premultiply(local), weight);
}

const OUT = new Vector3(0, 0, 1);
const DOWN = new Vector3(0, -1, 0);

export class Rig {
  readonly scene = new Scene();
  readonly root: Object3D;
  /** Idle standing height in model units: every size is relative to this. */
  readonly height: number;

  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly bones = new Map<string, Bone>();
  private readonly feetOffset: number;
  private readonly rest: {
    node: Object3D;
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
  }[] = [];

  static async load(url: string): Promise<Rig> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new Rig(gltf.scene, gltf.animations);
  }

  private constructor(model: Object3D, clips: readonly AnimationClip[]) {
    this.root = new Object3D();
    this.root.add(model);
    this.scene.add(this.root);
    this.mixer = new AnimationMixer(model);
    model.traverse((node) => {
      if ((node as Bone).isBone) this.bones.set(node.name, node as Bone);
      // Skinning moves vertices beyond the bind-pose bounds the culling test would use.
      node.frustumCulled = false;
      this.rest.push({
        node,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      });
    });
    for (const clip of clips) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      this.actions.set(clip.name, action);
    }
    this.feetOffset = 0;
    this.apply({ layers: [{ clip: 'Idle', time: 0 }] });
    this.root.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(model, true);
    this.height = box.max.y - box.min.y;
    this.feetOffset = -box.min.y;

    this.scene.add(new AmbientLight(0xffffff, 0.75));
    this.scene.add(new HemisphereLight(0xfff0e0, 0x8f6e58, 0.8));
    const key = new DirectionalLight(0xffe7cc, 2.6);
    key.position.set(4, 8, 8);
    this.scene.add(key);
    const rim = new DirectionalLight(0xffc891, 1.4);
    rim.position.set(-5, 4, -6);
    this.scene.add(rim);
  }

  clipDuration(name: ClipName): number {
    return this.actions.get(name)?.getClip().duration ?? 0;
  }

  apply(pose: Pose) {
    // A clip only writes the bones it animates (Idle: 7 channels), so start every pose from rest.
    for (const { node, position, quaternion, scale } of this.rest) {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
      node.scale.copy(scale);
    }
    for (const action of this.actions.values()) {
      action.enabled = false;
      action.setEffectiveWeight(0);
    }
    for (const layer of pose.layers) {
      const action = this.actions.get(layer.clip);
      if (!action) continue;
      action.enabled = true;
      action.play();
      action.paused = true;
      action.setEffectiveWeight(layer.weight ?? 1);
      action.time = layer.time % action.getClip().duration;
    }
    this.mixer.update(0);
    this.root.rotation.y = pose.yaw ?? 0;
    this.root.position.y = this.feetOffset;
    if (pose.sit) this.applySit(pose.sit);
    if (pose.look) {
      const head = this.bones.get('Head');
      head?.rotateY(pose.look.yaw);
      head?.rotateX(pose.look.pitch);
    }
    if (pose.point && pose.point.weight > 0) this.applyPoint(pose.point);
  }

  private applyPoint({ weight, x, y, side }: NonNullable<Pose['point']>) {
    const upper = this.bones.get(`UpperArm${side}`);
    const lower = this.bones.get(`LowerArm${side}`);
    const palm = this.bones.get(`Palm2${side}`);
    const middle = this.bones.get(`Middle1${side}`);
    if (!upper || !lower || !palm || !middle) return;
    this.root.updateWorldMatrix(true, true);
    const direction = new Vector3(x, y, 0.28).normalize();
    aimBone(upper, lower, direction, weight);
    aimBone(lower, palm, direction, weight);
    aimBone(palm, middle, direction, weight);
    // Curl the fist; the index stays long
    for (const name of [`Middle1${side}`, `Middle2${side}`, `Ring1${side}`, `Ring2${side}`]) {
      this.bones.get(name)?.rotateX(1.35 * weight);
    }
    for (const name of [`Thumb${side}`, `Thumb2${side}`]) {
      this.bones.get(name)?.rotateX(0.7 * weight);
    }
    const index = this.bones.get(`Index${side}`);
    const tip = this.bones.get(`Index2${side}`);
    if (index && tip) aimBone(index, tip, direction, weight);
  }

  /**
   * Thighs and shins toward the viewer and hands forward, so nothing hangs below the seat, over the
   * nav label. The rig's feet are not children of the legs (the clips move them separately), so they
   * are placed at the shin's end.
   */
  private applySit(weight: number) {
    const body = this.bones.get('Body');
    if (!body?.parent) return;
    this.root.updateWorldMatrix(true, true);
    const parentScale = body.parent.getWorldScale(new Vector3()).y || 1;
    body.position.y -= (this.height * SEAT_DROP * weight) / parentScale;
    this.root.updateWorldMatrix(true, true);
    const blend = (t: number) => DOWN.clone().lerp(OUT, t).normalize();
    for (const side of ['L', 'R']) {
      const upper = this.bones.get(`UpperLeg${side}`);
      const lower = this.bones.get(`LowerLeg${side}`);
      const end = lower?.children[0];
      const foot = this.bones.get(`Foot${side}`);
      if (!upper || !lower || !end || !foot?.parent) continue;
      aimBone(upper, lower, blend(weight), weight);
      aimBone(lower, end, blend(weight * 0.92), weight);
      lower.updateWorldMatrix(true, true);
      end.updateWorldMatrix(true, true);
      const tip = end.getWorldPosition(new Vector3());
      foot.parent.updateWorldMatrix(true, false);
      foot.position.copy(foot.parent.worldToLocal(tip));
    }
    for (const side of ['L', 'R']) {
      const sign = side === 'L' ? 1 : -1;
      const upper = this.bones.get(`UpperArm${side}`);
      const lower = this.bones.get(`LowerArm${side}`);
      const palm = this.bones.get(`Palm2${side}`);
      if (!upper || !lower || !palm) continue;
      aimBone(upper, lower, new Vector3(sign * 0.38, -0.55, 0.75).normalize(), weight);
      aimBone(lower, palm, new Vector3(-sign * 0.12, 0.02, 1).normalize(), weight);
    }
  }
}
