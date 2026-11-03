import type { CharacterMetrics, JumpTimings } from '../contract.ts';

/**
 * Fixed inputs for the behaviour unit tests (anchors, landing, motion and the host), not a character:
 * no model has them. They are the numbers of the CC0 robot that stood in during M1–M4
 * (poc/mascot-3d/M1-REPORT.md), kept so those tests' expectations stay as they were checked. Re-measuring
 * the real character never changes them.
 */
export const unitMetrics: CharacterMetrics = {
  standingTop: 1.003,
  seatedTop: 0.69,
  seatedBottom: -0.083,
  sitBulge: 0.08,
  halfWidth: 0.36,
  pointReach: 0.62,
  jumpTop: 1.313,
  walkSpeed: 1.05,
  runSpeed: 2.4,
};

export const unitJump: JumpTimings = { takeoff: 0.18, touchdown: 0.5, end: 0.705 };
