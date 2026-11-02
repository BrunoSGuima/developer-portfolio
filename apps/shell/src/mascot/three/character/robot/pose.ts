// The robot's way of doing what it's asked: its clips, plus bones for what it has no clip for.
import { Quaternion, Vector3, type Object3D } from 'three';
import type { Rig } from '../../rig.ts';
import type { PoseIntent } from '../contract.ts';

/** How far the pelvis drops when seated, as a fraction of the standing height. */
const SEAT_DROP = 0.3;

const aimFrom = new Vector3();
const aimTo = new Vector3();
const delta = new Quaternion();
const parentWorld = new Quaternion();
const local = new Quaternion();
const target = new Quaternion();

/** Rotates `bone` so the direction to `child` becomes `direction` (world space), by `weight`. */
function aimBone(bone: Object3D, child: Object3D, direction: Vector3, weight: number) {
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(aimFrom);
  child.getWorldPosition(aimTo);
  aimTo.sub(aimFrom).normalize();
  delta.setFromUnitVectors(aimTo, direction);
  bone.parent!.getWorldQuaternion(parentWorld);
  // The world rotation expressed in the parent's space, then applied before the bone's own
  local.copy(parentWorld).invert().multiply(delta).multiply(parentWorld);
  target.copy(bone.quaternion).premultiply(local);
  bone.quaternion.slerp(target, weight);
}

const OUT = new Vector3(0, 0, 1);
const DOWN = new Vector3(0, -1, 0);
const legDirection = new Vector3();
const shinEnd = new Vector3();
const scale = new Vector3();
const armDirection = new Vector3();

/**
 * Thighs and shins toward the viewer and hands forward, so nothing hangs below the seat, over the nav
 * label: the model's Sitting clip is only a slight dip. Its feet are not children of its legs (the
 * clips move them separately), so they are placed at the shin's end.
 */
function sit(rig: Rig, weight: number) {
  const body = rig.node('Body');
  if (!body?.parent) return;
  rig.root.updateWorldMatrix(true, true);
  const parentScale = body.parent.getWorldScale(scale).y || 1;
  body.position.y -= (rig.height * SEAT_DROP * weight) / parentScale;
  rig.root.updateWorldMatrix(true, true);
  for (const side of ['L', 'R']) {
    const upper = rig.node(`UpperLeg${side}`);
    const lower = rig.node(`LowerLeg${side}`);
    const end = lower?.children[0];
    const foot = rig.node(`Foot${side}`);
    if (!upper || !lower || !end || !foot?.parent) continue;
    aimBone(upper, lower, legDirection.copy(DOWN).lerp(OUT, weight).normalize(), weight);
    aimBone(
      lower,
      end,
      legDirection
        .copy(DOWN)
        .lerp(OUT, weight * 0.92)
        .normalize(),
      weight,
    );
    lower.updateWorldMatrix(true, true);
    end.updateWorldMatrix(true, true);
    end.getWorldPosition(shinEnd);
    foot.parent.updateWorldMatrix(true, false);
    foot.position.copy(foot.parent.worldToLocal(shinEnd));
  }
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1;
    const upper = rig.node(`UpperArm${side}`);
    const lower = rig.node(`LowerArm${side}`);
    const palm = rig.node(`Palm2${side}`);
    if (!upper || !lower || !palm) continue;
    aimBone(upper, lower, armDirection.set(sign * 0.38, -0.55, 0.75).normalize(), weight);
    aimBone(lower, palm, armDirection.set(-sign * 0.12, 0.02, 1).normalize(), weight);
  }
}

/** The model has no pointing clip. Down and across, towards the card's content. */
function point(rig: Rig, weight: number, arm: 'L' | 'R') {
  const upper = rig.node(`UpperArm${arm}`);
  const lower = rig.node(`LowerArm${arm}`);
  const palm = rig.node(`Palm2${arm}`);
  const middle = rig.node(`Middle1${arm}`);
  if (!upper || !lower || !palm || !middle) return;
  rig.root.updateWorldMatrix(true, true);
  const direction = armDirection.set(arm === 'L' ? 0.68 : -0.68, -0.62, 0.28).normalize();
  aimBone(upper, lower, direction, weight);
  aimBone(lower, palm, direction, weight);
  aimBone(palm, middle, direction, weight);
  // Curl the fist; the index stays long
  for (const name of [`Middle1${arm}`, `Middle2${arm}`, `Ring1${arm}`, `Ring2${arm}`]) {
    rig.node(name)?.rotateX(1.35 * weight);
  }
  for (const name of [`Thumb${arm}`, `Thumb2${arm}`]) rig.node(name)?.rotateX(0.7 * weight);
  const index = rig.node(`Index${arm}`);
  const tip = rig.node(`Index2${arm}`);
  if (index && tip) aimBone(index, tip, direction, weight);
}

export function poseRobot(rig: Rig, intent: PoseIntent) {
  const ground = 1 - intent.jump;
  rig.applyClips(
    [
      { clip: 'Idle', time: intent.idleTime, weight: ground * (1 - intent.gait) },
      { clip: 'Walking', time: intent.cycle, weight: ground * intent.gait * (1 - intent.run) },
      { clip: 'Running', time: intent.cycle, weight: ground * intent.gait * intent.run },
      { clip: 'Jump', time: intent.jumpTime, weight: intent.jump },
    ],
    intent.yaw,
  );
  if (intent.sit) sit(rig, intent.sit);
  if (intent.point > 0) {
    // Looks down at what it points to
    rig.node('Head')?.rotateX(0.22 * intent.point);
    point(rig, intent.point, intent.arm);
  }
}
