import type { Rig } from '../../rig.ts';
import type { PoseIntent } from '../contract.ts';

/** The test character's way of doing what it's asked: simple on purpose. */
export function poseFixture(rig: Rig, intent: PoseIntent) {
  const ground = 1 - intent.jump;
  rig.applyClips(
    [
      { clip: 'Rest', time: intent.idleTime, weight: ground * (1 - intent.gait) },
      { clip: 'Stroll', time: intent.cycle, weight: ground * intent.gait * (1 - intent.run) },
      { clip: 'Sprint', time: intent.cycle, weight: ground * intent.gait * intent.run },
      { clip: 'Leap', time: intent.jumpTime, weight: intent.jump },
    ],
    intent.yaw,
  );
  const upper = rig.node('Upper');
  if (upper) upper.position.y -= 0.4 * intent.sit;
  for (const name of ['ShinLeft', 'ShinRight']) {
    const shin = rig.node(name);
    if (shin) shin.scale.y = 1 - 0.8 * intent.sit;
  }
  if (intent.point > 0) {
    const arm = rig.node(intent.arm === 'L' ? 'LimbLeft' : 'LimbRight');
    arm?.rotateZ((intent.arm === 'L' ? 0.9 : -0.9) * intent.point);
  }
}
