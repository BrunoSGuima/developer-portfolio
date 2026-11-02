// Any character's model: loading, mixing clips, returning to rest, and letting go of it all. Knows
// nothing about what the character looks like: see character/.
import {
  AmbientLight,
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  Box3,
  DirectionalLight,
  HemisphereLight,
  LoopRepeat,
  type Material,
  type Mesh,
  Object3D,
  Quaternion,
  Scene,
  type Texture,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CharacterProfile, Poser } from './character/contract.ts';
import { missingFromModel } from './character/validate.ts';

export interface ClipLayer {
  clip: string;
  time: number;
  weight: number;
}

export class Rig {
  readonly scene = new Scene();
  readonly root: Object3D;
  /** Standing height in model units: every size is relative to this. */
  readonly height: number;

  private readonly model: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private readonly nodes = new Map<string, Object3D>();
  private readonly rest: {
    node: Object3D;
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
  }[] = [];
  private feetOffset = 0;

  /** Loads a character. Rejects if its model lacks what its profile requires: the caller stays on 2D. */
  static async load(profile: CharacterProfile, poser: Poser): Promise<Rig> {
    const gltf = await new GLTFLoader().loadAsync(profile.modelUrl);
    const clipNames = gltf.animations.map((clip) => clip.name);
    const nodeNames: string[] = [];
    gltf.scene.traverse((node) => nodeNames.push(node.name));
    const missing = missingFromModel(profile, { clipNames, nodeNames });
    if (missing.length > 0) throw new Error(`Character model lacks ${missing.join(', ')}`);
    return new Rig(gltf.scene, gltf.animations, profile, poser);
  }

  private constructor(
    model: Object3D,
    clips: readonly AnimationClip[],
    profile: CharacterProfile,
    poser: Poser,
  ) {
    this.model = model;
    this.root = new Object3D();
    this.root.add(model);
    this.scene.add(this.root);
    this.mixer = new AnimationMixer(model);
    model.traverse((node) => {
      this.nodes.set(node.name, node);
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
    for (const { node, visible } of Object.values(profile.accessories ?? {})) {
      const accessory = this.nodes.get(node);
      if (accessory) accessory.visible = visible;
    }

    // The height and feet come from the standing idle.
    this.height = 1;
    poser(this, {
      idleTime: 0,
      gait: 0,
      run: 0,
      cycle: 0,
      jump: 0,
      jumpTime: 0,
      sit: 0,
      yaw: 0,
      point: 0,
      arm: 'L',
    });
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

  /** A node of the model, by name, for a character's own pose code. */
  node(name: string): Object3D | undefined {
    return this.nodes.get(name);
  }

  /** Back to rest, then the clips. A clip only writes the nodes it animates. */
  applyClips(layers: readonly ClipLayer[], yaw: number) {
    for (const { node, position, quaternion, scale } of this.rest) {
      node.position.copy(position);
      node.quaternion.copy(quaternion);
      node.scale.copy(scale);
    }
    for (const action of this.actions.values()) {
      action.enabled = false;
      action.setEffectiveWeight(0);
    }
    for (const layer of layers) {
      const action = this.actions.get(layer.clip);
      if (!action || layer.weight <= 0) continue;
      action.enabled = true;
      action.play();
      action.paused = true;
      action.setEffectiveWeight(layer.weight);
      action.time = layer.time % action.getClip().duration;
    }
    this.mixer.update(0);
    this.root.rotation.y = yaw;
    this.root.position.y = this.feetOffset;
    this.root.updateWorldMatrix(true, true);
  }

  /** Lets go of everything the model holds: the renderer's own dispose doesn't reach these. */
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    const textures = new Set<Texture>();
    this.model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if ((value as Texture | null)?.isTexture) textures.add(value as Texture);
        }
        material.dispose();
      }
    });
    for (const texture of textures) texture.dispose();
    this.scene.clear();
  }
}
