import type { CharacterProfile } from '../contract.ts';

/**
 * The temporary robot (CC0, see RobotExpressive.README.md), standing in until the custom character is
 * ready. Its metrics were measured from its rendered pixels (poc/mascot-3d/M1-REPORT.md).
 */
export const robot: CharacterProfile = {
  modelUrl: new URL('./RobotExpressive.glb', import.meta.url).href,
  metrics: {
    standingTop: 1.003,
    seatedTop: 0.69,
    seatedBottom: -0.083,
    sitBulge: 0.08,
    halfWidth: 0.36,
    pointReach: 0.62,
    jumpTop: 1.313,
    walkSpeed: 1.05,
    runSpeed: 2.4,
  },
  jump: { takeoff: 0.18, touchdown: 0.5, end: 0.705 },
  requiredClips: ['Idle', 'Walking', 'Running', 'Jump'],
  requiredNodes: [
    'Body',
    'Head',
    ...['L', 'R'].flatMap((side) => [
      `UpperArm${side}`,
      `LowerArm${side}`,
      `Palm2${side}`,
      `Middle1${side}`,
      `UpperLeg${side}`,
      `LowerLeg${side}`,
      `Foot${side}`,
    ]),
  ],
  loadPoser: async () => (await import('./pose.ts')).poseRobot,
};
