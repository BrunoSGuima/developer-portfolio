import type { CharacterProfile } from '../contract.ts';

/** How large he is drawn, approved by the owner: everything else follows. 57 px on today's header. */
const SCALE = 1.25;

/**
 * The character himself (see README.md). His metrics were measured from rendered pixels at scale 1,
 * through the engine, with `__mascot3d.measurePose` and `jumpReach`.
 */
export const bruno: CharacterProfile = {
  modelUrl: new URL('./bruno.glb', import.meta.url).href,
  metrics: {
    standingTop: 1 * SCALE,
    seatedTop: 0.833 * SCALE,
    seatedBottom: 0,
    sitBulge: 0.056 * SCALE,
    halfWidth: 0.26 * SCALE,
    pointReach: 0.33 * SCALE,
    jumpTop: 1.011 * SCALE,
    // The clips cover this much ground without their feet sliding, at any scale.
    walkSpeed: 0.754 * SCALE,
    runSpeed: 1.888 * SCALE,
  },
  jump: { takeoff: 0.3, touchdown: 0.7, end: 1 },
  requiredClips: ['Idle', 'Walk', 'Run', 'Jump', 'Sit', 'PointL', 'PointR'],
  requiredNodes: [
    'Hips',
    'Head',
    ...['L', 'R'].flatMap((side) => [
      `UpperArm${side}`,
      `LowerArm${side}`,
      `Hand${side}`,
      `UpperLeg${side}`,
      `LowerLeg${side}`,
      `Foot${side}`,
    ]),
  ],
  look: {
    scale: SCALE,
    texture: new URL('./base.webp', import.meta.url).href,
    outline: { width: 0.00194, push: 0.0567, color: 0x17110e },
    darkHalo: true,
  },
  loadPoser: async () => (await import('./pose.ts')).poseBruno,
};
