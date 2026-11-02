// Checks a character's GLB without a browser, before anyone tries to load it.
//
//   node scripts/check-mascot-model.mjs <model.glb> [--clips Idle,Walk,Run,Jump]
//
// Rules the site's Content Security Policy forces, and missing clips, fail it. Size targets only warn:
// they are optimization targets, and raising one needs measured performance and the owner's approval
// (docs/assets/MASCOT-3D-SPEC.md).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const SIZE_TARGETS = { bytes: 300 * 1024, triangles: 10_000, bones: 30 };

// These need a WASM or blob: worker decoder, which the CSP blocks.
const BLOCKED_EXTENSIONS = [
  'KHR_draco_mesh_compression',
  'KHR_texture_basisu',
  'EXT_meshopt_compression',
  'KHR_meshopt_compression',
];

export function readGlb(file) {
  const data = readFileSync(file);
  if (data.toString('latin1', 0, 4) !== 'glTF')
    throw new Error(`${file} is not a binary glTF file.`);
  const length = data.readUInt32LE(12);
  return { size: data.length, gltf: JSON.parse(data.toString('utf8', 20, 20 + length)) };
}

/** The problems that fail the check, the warnings that don't, and the model's facts. */
export function checkModel({ size, gltf }, requiredClips = []) {
  const problems = [];
  const warnings = [];
  const embedded = (gltf.images ?? []).filter(
    (image) => image.bufferView !== undefined || image.uri?.startsWith('data:'),
  );
  if (embedded.length > 0) {
    problems.push(
      `${embedded.length} embedded image(s): the CSP blocks them. Use vertex colours or separate same-origin files.`,
    );
  }
  for (const name of [...(gltf.extensionsUsed ?? []), ...(gltf.extensionsRequired ?? [])]) {
    if (BLOCKED_EXTENSIONS.includes(name) && !problems.some((p) => p.includes(name))) {
      problems.push(`${name}: its decoder needs WASM or a blob: worker, which the CSP blocks.`);
    }
  }
  const clips = (gltf.animations ?? []).map((clip) => clip.name);
  for (const clip of requiredClips) {
    if (!clips.includes(clip)) problems.push(`Missing clip: ${clip}.`);
  }

  let triangles = 0;
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const source = primitive.indices ?? primitive.attributes.POSITION;
      triangles += gltf.accessors[source].count / 3;
    }
  }
  const bones = Math.max(0, ...(gltf.skins ?? []).map((skin) => skin.joints.length));
  const facts = { size, triangles, bones, clips };
  if (size > SIZE_TARGETS.bytes) {
    warnings.push(
      `${Math.round(size / 1024)} KB is over the ${SIZE_TARGETS.bytes / 1024} KB target.`,
    );
  }
  if (triangles > SIZE_TARGETS.triangles) {
    warnings.push(`${triangles} triangles is over the ${SIZE_TARGETS.triangles} target.`);
  }
  if (bones > SIZE_TARGETS.bones)
    warnings.push(`${bones} bones is over the ${SIZE_TARGETS.bones} target.`);
  return { problems, warnings, facts };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [file, ...rest] = process.argv.slice(2);
  if (!file) {
    console.error('Usage: node scripts/check-mascot-model.mjs <model.glb> [--clips A,B]');
    process.exit(2);
  }
  const at = rest.indexOf('--clips');
  const clips = at >= 0 ? (rest[at + 1] ?? '').split(',').filter(Boolean) : [];
  const { problems, warnings, facts } = checkModel(readGlb(file), clips);
  console.log(
    `${file}: ${Math.round(facts.size / 1024)} KB, ${facts.triangles} triangles, ${facts.bones} bones, clips: ${facts.clips.join(', ')}`,
  );
  for (const warning of warnings) console.warn(`Target: ${warning}`);
  for (const problem of problems) console.error(`Problem: ${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(warnings.length > 0 ? 'Passes, with size targets to review.' : 'Passes.');
}
