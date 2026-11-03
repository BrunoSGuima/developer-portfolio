// Writes the 3D mascot's test character: boxes on animated nodes, sharing nothing with any real model
// (not its bone names, clip names, skeleton or proportions). If behaviour code ever depended on a
// real character, this one would break. Run again only if the fixture itself must change.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(
  new URL('../apps/shell/src/mascot/three/character/fixture/fixture.glb', import.meta.url),
);

const chunks = [];
const views = [];
const accessors = [];
let offset = 0;
function push(buffer, target) {
  const padded = Buffer.concat([buffer, Buffer.alloc((4 - (buffer.length % 4)) % 4)]);
  views.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: buffer.length,
    ...(target && { target }),
  });
  chunks.push(padded);
  offset += padded.length;
  return views.length - 1;
}
function accessor(values, type, componentType = 5126, extra = {}) {
  const buffer =
    componentType === 5126
      ? Buffer.from(new Float32Array(values).buffer)
      : Buffer.from(new Uint16Array(values).buffer);
  const size = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
  accessors.push({
    bufferView: push(buffer, extra.target),
    componentType,
    count: values.length / size,
    type,
    ...(extra.min && { min: extra.min, max: extra.max }),
  });
  return accessors.length - 1;
}

/** A box's mesh primitive: x, y and z are its centred half sizes, from `bottom` upwards in y. */
function box(hx, height, hz) {
  const faces = [
    [
      [1, 0, 0],
      [
        [hx, 0, hz],
        [hx, 0, -hz],
        [hx, height, -hz],
        [hx, height, hz],
      ],
    ],
    [
      [-1, 0, 0],
      [
        [-hx, 0, -hz],
        [-hx, 0, hz],
        [-hx, height, hz],
        [-hx, height, -hz],
      ],
    ],
    [
      [0, 1, 0],
      [
        [-hx, height, hz],
        [hx, height, hz],
        [hx, height, -hz],
        [-hx, height, -hz],
      ],
    ],
    [
      [0, -1, 0],
      [
        [-hx, 0, -hz],
        [hx, 0, -hz],
        [hx, 0, hz],
        [-hx, 0, hz],
      ],
    ],
    [
      [0, 0, 1],
      [
        [-hx, 0, hz],
        [hx, 0, hz],
        [hx, height, hz],
        [-hx, height, hz],
      ],
    ],
    [
      [0, 0, -1],
      [
        [hx, 0, -hz],
        [-hx, 0, -hz],
        [-hx, height, -hz],
        [hx, height, -hz],
      ],
    ],
  ];
  const positions = [];
  const normals = [];
  const indices = [];
  faces.forEach(([normal, corners], face) => {
    for (const corner of corners) {
      positions.push(...corner);
      normals.push(...normal);
    }
    const n = face * 4;
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  });
  return {
    attributes: {
      POSITION: accessor(positions, 'VEC3', 5126, {
        target: 34962,
        min: [-hx, 0, -hz],
        max: [hx, height, hz],
      }),
      NORMAL: accessor(normals, 'VEC3', 5126, { target: 34962 }),
    },
    indices: accessor(indices, 'SCALAR', 5123, { target: 34963 }),
  };
}

const materials = ['#3a6ea5', '#f2c14e', '#c8553d', '#6a994e'].map((hex, i) => {
  const c = [1, 3, 5].map((at) => (parseInt(hex.slice(at, at + 2), 16) / 255) ** 2.2);
  return {
    name: `Tone${i}`,
    pbrMetallicRoughness: { baseColorFactor: [...c, 1], roughnessFactor: 0.7 },
  };
});
const mesh = (name, material, ...size) => ({
  name,
  primitives: [{ ...box(...size), material }],
});
const meshes = [
  mesh('LegShape', 0, 0.12, 0.5, 0.15),
  mesh('TorsoShape', 0, 0.3, 0.9, 0.2),
  mesh('HeadShape', 1, 0.3, 0.6, 0.3),
  mesh('LimbShape', 2, 0.08, 0.6, 0.08),
  mesh('PropShape', 3, 0.14, 0.4, 0.04),
];

const nodes = [
  { name: 'Frame', children: [1, 2, 3] },
  { name: 'ShinLeft', mesh: 0, translation: [0.15, 0, 0] },
  { name: 'ShinRight', mesh: 0, translation: [-0.15, 0, 0] },
  { name: 'Upper', translation: [0, 0.5, 0], children: [4, 5, 6, 7, 8] },
  { name: 'Trunk', mesh: 1 },
  { name: 'Topper', mesh: 2, translation: [0, 0.9, 0] },
  // Rest hanging down from the shoulder, by a half turn around z
  { name: 'LimbLeft', mesh: 3, translation: [0.4, 0.85, 0], rotation: [0, 0, 1, 0] },
  { name: 'LimbRight', mesh: 3, translation: [-0.4, 0.85, 0], rotation: [0, 0, 1, 0] },
  { name: 'Prop', mesh: 4, translation: [0.6, 0.2, 0.05] },
];

const animation = (name, target, path, times, values) => {
  const type = path === 'rotation' ? 'VEC4' : 'VEC3';
  const input = accessors.length;
  accessor(times, 'SCALAR', 5126, { min: [times[0]], max: [times.at(-1)] });
  const output = accessor(values, type);
  return {
    name,
    samplers: [{ input, output, interpolation: 'LINEAR' }],
    channels: [{ sampler: 0, target: { node: nodes.findIndex((n) => n.name === target), path } }],
  };
};
const nod = (angle) => [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
const animations = [
  animation('Rest', 'Topper', 'rotation', [0, 1, 2], [...nod(0), ...nod(0.1), ...nod(0)]),
  animation('Stroll', 'Frame', 'translation', [0, 0.4, 0.8], [0, 0, 0, 0, 0.02, 0, 0, 0, 0]),
  animation('Sprint', 'Frame', 'translation', [0, 0.25, 0.5], [0, 0, 0, 0, 0.05, 0, 0, 0, 0]),
  animation(
    'Leap',
    'Frame',
    'translation',
    [0, 0.2, 0.45, 0.7, 1],
    [0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0],
  ),
];

const bin = Buffer.concat(chunks);
const json = Buffer.from(
  JSON.stringify({
    asset: { version: '2.0', generator: 'scripts/build-mascot-fixture.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials,
    animations,
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  }),
);
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.write('glTF', 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);
const chunk = (length, type) => {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(length, 0);
  head.write(type, 4);
  return head;
};
writeFileSync(
  OUT,
  Buffer.concat([
    header,
    chunk(jsonChunk.length, 'JSON'),
    jsonChunk,
    chunk(bin.length, 'BIN\0'),
    bin,
  ]),
);
console.log(`Wrote ${OUT}`);
