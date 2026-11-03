// His way of doing what he's asked: everything is a clip. Every clip animates the whole body, so the
// weights add up to 1 and blending from one pose to another needs nothing else.
import type { Rig } from '../../rig.ts';
import type { PoseIntent } from '../contract.ts';

export function poseBruno(rig: Rig, intent: PoseIntent) {
  const ground = 1 - intent.jump;
  const standing = ground * (1 - intent.sit);
  const still = standing * (1 - intent.gait);
  rig.applyClips(
    [
      { clip: 'Idle', time: intent.idleTime, weight: still * (1 - intent.point) },
      {
        clip: intent.arm === 'L' ? 'PointL' : 'PointR',
        time: intent.idleTime,
        weight: still * intent.point,
      },
      { clip: 'Walk', time: intent.cycle, weight: standing * intent.gait * (1 - intent.run) },
      { clip: 'Run', time: intent.cycle, weight: standing * intent.gait * intent.run },
      { clip: 'Sit', time: intent.idleTime, weight: ground * intent.sit },
      { clip: 'Jump', time: intent.jumpTime, weight: intent.jump },
    ],
    intent.yaw,
  );
}
