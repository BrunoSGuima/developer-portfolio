import { describe, expect, it } from 'vitest';
import type { NavPhase } from './machine.ts';
import {
  jumpTop,
  type Motion,
  type MotionGoal,
  POINT_SECONDS,
  seatedMotion,
  stepMotion,
} from './motion.ts';

const DT = 1 / 60;
const goal = (phase: NavPhase, targetX = 300, riseTo = false): MotionGoal => ({
  phase,
  targetX,
  size: 48,
  riseTo,
  run: false,
  token: 1,
  navY: 68,
  dest: null,
  goal: 'nav',
  side: 'L',
  faceX: 0,
});

function runUntilDone(start: Motion, phase: NavPhase, targetX = 300) {
  let motion = start;
  for (let i = 0; i < 2000; i += 1) {
    const result = stepMotion(motion, goal(phase, targetX), DT);
    motion = result.motion;
    if (result.done) return { motion, frames: i + 1 };
  }
  throw new Error(`${phase} never finished`);
}

describe('stepMotion', () => {
  it('stands up, then turns towards the target', () => {
    const { motion } = runUntilDone(seatedMotion(100), 'standing');
    expect(motion).toMatchObject({ sit: 0, x: 100 });
    expect(motion.yaw).toBeGreaterThan(0);
  });

  it('turns the other way for a target on the left', () => {
    const { motion } = runUntilDone(seatedMotion(500), 'standing');
    expect(motion.yaw).toBeLessThan(0);
  });

  it('walks to exactly the target', () => {
    const up = runUntilDone(seatedMotion(100), 'standing').motion;
    expect(runUntilDone(up, 'walking', 170).motion.x).toBe(170);
  });

  it('turns back to the viewer and sits', () => {
    const up = runUntilDone(seatedMotion(100), 'standing').motion;
    const there = runUntilDone(up, 'walking').motion;
    expect(runUntilDone(there, 'sitting').motion).toMatchObject({ sit: 1, yaw: 0, gait: 0 });
  });

  it('keeps its gait for the whole trip, however little distance remains', () => {
    const start = { ...runUntilDone(seatedMotion(100), 'standing').motion, run: 1, gait: 1 };
    let motion = start;
    for (let i = 0; i < 2000 && motion.x !== 300; i += 1) {
      motion = stepMotion(motion, { ...goal('walking'), run: true }, DT).motion;
      expect(motion.run).toBe(1);
    }
    expect(motion.x).toBe(300);
  });

  it('a walk stays a walk, however far away the target is', () => {
    let motion = { ...runUntilDone(seatedMotion(100), 'standing').motion };
    for (let i = 0; i < 300; i += 1) {
      motion = stepMotion(motion, goal('walking', 5000), DT).motion;
      expect(motion.run).toBe(0);
    }
  });

  it('changes gait mid-trip smoothly when told to, a limited step at a time', () => {
    let motion: Motion = { ...seatedMotion(100), sit: 0, gait: 1, run: 0 };
    let last = motion.x;
    let lastSpeed = 1.05 * 48;
    for (let i = 0; i < 60; i += 1) {
      motion = stepMotion(motion, { ...goal('walking', 5000), run: true }, DT).motion;
      const speed = (motion.x - last) / DT;
      expect(speed - lastSpeed).toBeLessThanOrEqual(((2.4 - 1.05) * 48 * DT) / 0.2 + 1e-6);
      last = motion.x;
      lastSpeed = speed;
    }
    expect(motion.run).toBe(1);
  });

  it('never moves further in a frame than its speed allows, even when re-targeted', () => {
    let motion = runUntilDone(seatedMotion(100), 'standing').motion;
    let target = 900;
    for (let i = 0; i < 240; i += 1) {
      if (i === 60) target = 50; // the user changed their mind mid-trip
      const next = stepMotion(motion, goal('walking', target), DT).motion;
      expect(Math.abs(next.x - motion.x)).toBeLessThanOrEqual(2.4 * 48 * DT + 1e-9);
      expect(Math.abs(next.yaw - motion.yaw)).toBeLessThanOrEqual(5.8 * DT + 1e-9);
      motion = next;
    }
  });

  it('rises towards a ring and settles back, a limited step at a time', () => {
    const up = stepMotion(seatedMotion(100), goal('seated', 100, true), DT).motion;
    expect(up.rise).toBeCloseTo(DT / 0.12);
    let motion = up;
    for (let i = 0; i < 20; i += 1)
      motion = stepMotion(motion, goal('seated', 100, true), DT).motion;
    expect(motion.rise).toBe(1);
    expect(stepMotion(motion, goal('seated', 100), DT).motion.rise).toBeCloseTo(1 - DT / 0.12);
  });

  it('standing up again from a half-finished sit continues from where it is', () => {
    const halfway: Motion = { ...seatedMotion(100), sit: 0.5 };
    const next = stepMotion(halfway, goal('standing'), DT).motion;
    expect(next.sit).toBeCloseTo(0.5 - DT / 0.45);
  });
});

describe('the jump', () => {
  const NAV_Y = 68;
  const flying = (dest: { x: number; y: number }, kind: 'nav' | 'card', token = 1): MotionGoal => ({
    ...goal('jumping', dest.x),
    dest,
    goal: kind,
    token,
    navY: NAV_Y,
  });
  const standing: Motion = { ...seatedMotion(100), sit: 0 };
  const CARD = { x: 900, y: 274 };

  function fly(start: Motion, target: MotionGoal, frames: number) {
    let motion = start;
    for (let i = 0; i < frames; i += 1) motion = stepMotion(motion, target, DT).motion;
    return motion;
  }

  it('crouches on the spot first, then leaves the ground', () => {
    const crouching = fly(standing, flying(CARD, 'card'), 10);
    expect(crouching.x).toBe(100);
    expect(crouching.y).toBe(NAV_Y);
    expect(fly(standing, flying(CARD, 'card'), 40).x).toBeGreaterThan(100);
  });

  it('lands exactly on the card and reports it, with the time on the card starting', () => {
    let motion = standing;
    let done = false;
    for (let i = 0; i < 300 && !done; i += 1) {
      const result = stepMotion(motion, flying(CARD, 'card'), DT);
      motion = result.motion;
      done = result.done;
    }
    expect(done).toBe(true);
    expect(motion).toMatchObject({ x: 900, y: 274, flight: null, pointTime: 0, idle: 0 });
  });

  it('landing back on the nav returns to the nav line', () => {
    let motion: Motion = { ...standing, x: 900, y: 274 };
    let done = false;
    for (let i = 0; i < 300 && !done; i += 1) {
      const result = stepMotion(motion, flying({ x: 800, y: NAV_Y }, 'nav'), DT);
      motion = result.motion;
      done = result.done;
    }
    expect(motion).toMatchObject({ x: 800, y: null, flight: null });
  });

  it('bends in the air when the destination changes: position and velocity stay continuous', () => {
    const inAir = fly(standing, flying(CARD, 'card'), 35);
    expect(inAir.flight?.wait).toBe(0);
    const before = fly(inAir, flying(CARD, 'card'), 1);
    const afterBend = stepMotion(inAir, flying({ x: 400, y: NAV_Y }, 'nav', 2), DT).motion;
    // One frame on either course stays close: no teleport
    expect(Math.hypot(afterBend.x - before.x, afterBend.y! - before.y!)).toBeLessThan(2);
    expect(afterBend.flight?.wait).toBe(0);
  });

  it('a new destination before leaving the ground just starts over from where it stands', () => {
    const crouching = fly(standing, flying(CARD, 'card'), 5);
    const next = stepMotion(crouching, flying({ x: 400, y: NAV_Y }, 'nav', 2), DT).motion;
    expect(next.x).toBe(100);
    expect(next.flight?.wait).toBeGreaterThan(0);
  });

  it('keeps moving when a layout change moves the landing', () => {
    const inAir = fly(standing, flying(CARD, 'card'), 35);
    const moved = stepMotion(inAir, flying({ x: 950, y: 280 }, 'card'), DT).motion;
    expect(moved.flight?.arc.to).toEqual({ x: 950, y: 280 });
    expect(Math.abs(moved.x - inAir.x)).toBeLessThan(30);
  });

  it('reaches higher than standing in mid-air only', () => {
    expect(jumpTop(0)).toBeCloseTo(1.003);
    expect(jumpTop(0.33)).toBeCloseTo(1.313);
    expect(jumpTop(0.7)).toBeCloseTo(1.003);
  });
});

describe('on the card', () => {
  const on = (phase: NavPhase, side: 'L' | 'R' = 'R'): MotionGoal => ({
    ...goal(phase, 900),
    dest: { x: 900, y: 274 },
    goal: 'card',
    side,
    faceX: 800,
  });
  const landed: Motion = { ...seatedMotion(900), sit: 0, y: 274 };

  it('points once: up, held, down, then reports done', () => {
    let motion = landed;
    let peak = 0;
    let frames = 0;
    let done = false;
    while (!done && frames < 400) {
      const result = stepMotion(motion, on('pointing'), DT);
      motion = result.motion;
      done = result.done;
      peak = Math.max(peak, motion.point);
      frames += 1;
    }
    expect(done).toBe(true);
    expect(peak).toBe(1);
    expect(motion.point).toBe(0);
    expect(frames * DT).toBeCloseTo(POINT_SECONDS, 1);
  });

  it('turns slightly towards the card’s centre and uses the arm on that side', () => {
    let motion = landed;
    for (let i = 0; i < 30; i += 1) motion = stepMotion(motion, on('perched'), DT).motion;
    expect(motion.yaw).toBeLessThan(0);
    expect(motion.side).toBe('R');
  });

  it('follows a landing that moved, without a phase change', () => {
    const moved = { ...on('perched'), dest: { x: 950, y: 300 } };
    expect(stepMotion(landed, moved, DT).motion).toMatchObject({ x: 950, y: 300 });
  });
});
