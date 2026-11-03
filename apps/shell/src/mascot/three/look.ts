// How a character with a `look` is drawn: unlit, from its own texture, with an optional outline.
// Knows nothing about any particular character.
import {
  BackSide,
  BufferAttribute,
  Color,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  type Object3D,
  ShaderMaterial,
  type SkinnedMesh,
  SkinnedMesh as ThreeSkinnedMesh,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three';
import type { CharacterLook } from './character/contract.ts';

/**
 * The model's normals, moved out along the surface after skinning, drawn from behind in one flat
 * colour. It never goes below the feet (y 0 in the scene), or the character would seem to sink.
 */
const OUTLINE_VERTEX = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec3 smoothNormal;
uniform float width;
uniform float push;
void main() {
  vec3 objectNormal = smoothNormal;
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 transformed = vec3(position);
  #include <skinning_vertex>
  vec4 world = modelMatrix * vec4(transformed, 1.0);
  world.xyz += normalize(mat3(modelMatrix) * objectNormal) * width;
  world.y = max(world.y, 0.0);
  vec4 view = viewMatrix * world;
  view.z -= push;
  gl_Position = projectionMatrix * view;
}`;

const OUTLINE_FRAGMENT = /* glsl */ `
uniform vec3 color;
void main() { gl_FragColor = vec4(color, 1.0); }`;

/** A loaded image, ready for glTF's UVs. Rejects if it can't be fetched: the caller stays on 2D. */
export async function loadLookTexture(url: string): Promise<Texture> {
  const texture = await new TextureLoader().loadAsync(url);
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** One normal per position: split vertices (at UV seams) would otherwise open cracks in the outline. */
function smoothNormals(mesh: Mesh): BufferAttribute {
  const { position, normal } = mesh.geometry.attributes as Record<
    string,
    BufferAttribute | undefined
  > as { position: BufferAttribute; normal: BufferAttribute };
  const summed = new Map<string, Vector3>();
  const key = (i: number) =>
    `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
  for (let i = 0; i < position.count; i += 1) {
    const k = key(i);
    const total = summed.get(k) ?? new Vector3();
    total.x += normal.getX(i);
    total.y += normal.getY(i);
    total.z += normal.getZ(i);
    summed.set(k, total);
  }
  const smooth = new Float32Array(position.count * 3);
  const unit = new Vector3();
  for (let i = 0; i < position.count; i += 1) {
    unit.copy(summed.get(key(i)) ?? unit).normalize();
    smooth.set([unit.x, unit.y, unit.z], i * 3);
  }
  return new BufferAttribute(smooth, 3);
}

/** Applies a look to a model. Returns its outlines, for showing and hiding with the theme. */
export function applyLook(
  model: Object3D,
  look: CharacterLook,
  texture: Texture,
  height: number,
): SkinnedMesh[] {
  const skinned: SkinnedMesh[] = [];
  model.traverse((node) => {
    if ((node as SkinnedMesh).isSkinnedMesh) skinned.push(node as SkinnedMesh);
  });
  const outlines: SkinnedMesh[] = [];
  const unlit = new MeshBasicMaterial({ map: texture });
  for (const mesh of skinned) {
    const old: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of old) material.dispose();
    mesh.material = unlit;
    if (!look.outline || !mesh.parent) continue;
    const geometry = mesh.geometry.clone();
    geometry.setAttribute('smoothNormal', smoothNormals(mesh));
    const outline = new ThreeSkinnedMesh(
      geometry,
      new ShaderMaterial({
        side: BackSide,
        uniforms: {
          width: { value: look.outline.width * height },
          push: { value: look.outline.push * height },
          color: { value: new Color(look.outline.color) },
        },
        vertexShader: OUTLINE_VERTEX,
        fragmentShader: OUTLINE_FRAGMENT,
      }),
    );
    outline.frustumCulled = false;
    outline.position.copy(mesh.position);
    outline.quaternion.copy(mesh.quaternion);
    outline.scale.copy(mesh.scale);
    mesh.parent.add(outline);
    outline.updateMatrixWorld(true);
    outline.bind(mesh.skeleton, mesh.bindMatrix);
    outlines.push(outline);
  }
  return outlines;
}
