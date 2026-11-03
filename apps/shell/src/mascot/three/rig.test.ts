import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CharacterProfile } from './character/contract.ts';
import { bruno } from './character/bruno/profile.ts';
import { Rig } from './rig.ts';

// A clip's held pose must survive many frames: the mixer skips values that haven't changed, and the rig
// resets every node to rest before each frame.
async function loadRig() {
  const file = readFileSync('src/mascot/three/character/bruno/bruno.glb');
  const profile: CharacterProfile = {
    ...bruno,
    modelUrl: `data:model/gltf-binary;base64,${file.toString('base64')}`,
    // The texture is the browser's business: this is about the bones.
    look: undefined as never,
  };
  return Rig.load(profile, (rig, intent) => rig.applyClips([], intent.yaw));
}

const pose = (rig: Rig, name: string) => {
  const node = rig.node(name)!;
  return { position: node.position.clone(), quaternion: node.quaternion.clone() };
};

describe('a held clip pose', () => {
  it.each([
    ['Sit', ['Hips', 'UpperLegL', 'UpperLegR', 'LowerLegL', 'FootR', 'UpperArmL', 'LowerArmR']],
    ['PointL', ['LowerArmL', 'HandL', 'Neck']],
    ['PointR', ['LowerArmR', 'HandR', 'Neck']],
  ] as const)('%s keeps its unchanging bones in place, frame after frame', async (clip, names) => {
    const rig = await loadRig();
    const rest = Object.fromEntries(names.map((name) => [name, pose(rig, name)]));
    for (let frame = 0; frame < 5; frame += 1) {
      rig.applyClips([{ clip, time: 0, weight: 1 }], 0);
      for (const name of names) {
        const now = pose(rig, name);
        const moved =
          now.position.distanceTo(rest[name]!.position) +
          now.quaternion.angleTo(rest[name]!.quaternion);
        expect(moved, `${name}, frame ${frame}`).toBeGreaterThan(0.01);
      }
    }
    rig.dispose();
  });

  it('returns to rest when no clip asks for anything else', async () => {
    const rig = await loadRig();
    const rest = pose(rig, 'Hips');
    rig.applyClips([{ clip: 'Sit', time: 0, weight: 1 }], 0);
    rig.applyClips([], 0);
    expect(pose(rig, 'Hips').position.distanceTo(rest.position)).toBeCloseTo(0);
    rig.dispose();
  });

  it('blends without a jump between a held pose and the next', async () => {
    const rig = await loadRig();
    const heights: number[] = [];
    for (const sit of [1, 1, 0.999, 0.998]) {
      rig.applyClips(
        [
          { clip: 'Idle', time: 0, weight: 1 - sit },
          { clip: 'Sit', time: 0, weight: sit },
        ],
        0,
      );
      heights.push(rig.node('Hips')!.position.length());
    }
    for (let i = 1; i < heights.length; i += 1) {
      expect(Math.abs(heights[i]! - heights[i - 1]!)).toBeLessThan(0.01);
    }
    rig.dispose();
  });
});
