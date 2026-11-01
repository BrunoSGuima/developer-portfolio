import { type Arc, arcVelocity, bendArc, makeArc, type Point, sampleArc } from './arc.ts';
import { gaitSpeed } from './anchors.ts';
import type { NavPhase } from './machine.ts';

/** A flight, from its anticipation to its landing dip. */
export interface Flight {
  /** The phase token it belongs to: a new one means the destination changed. */
  token: number;
  arc: Arc;
  /** Seconds into the arc. */
  time: number;
  /** Seconds of anticipation left, before leaving the ground. */
  wait: number;
  /** Seconds of the landing dip so far. */
  landed: number;
  /** Where the clip was when this flight took over. */
  clipFrom: number;
}

/**
 * Everything continuous about the character. Each value only ever moves at a limited rate towards
 * what the current phase wants, so an interruption can never make the character jump.
 */
export interface Motion {
  /** Document pixels. */
  x: number;
  /** Feet position while off the nav line; null while on it. */
  y: number | null;
  /** 0 standing, 1 seated. */
  sit: number;
  /** Body turn in radians: 0 faces the viewer, positive turns towards larger x. */
  yaw: number;
  /** 0 idle, 1 fully in a walk or run cycle. */
  gait: number;
  /** 0 walking, 1 running. */
  run: number;
  /** Seconds into the walk or run cycle. */
  cycle: number;
  /** Seconds into the idle clip. */
  idle: number;
  /** 0 on the rest line, 1 risen above a focus ring. */
  rise: number;
  /** 0 not jumping, 1 fully in the Jump clip. */
  jumpBlend: number;
  /** Seconds into the Jump clip. */
  clip: number;
  /** 0 arm down, 1 pointing. */
  point: number;
  /** Seconds since landing. */
  pointTime: number;
  /** The arm in use, kept while it lowers. */
  side: 'L' | 'R';
  flight: Flight | null;
}

export const seatedMotion = (x: number, rise = 0): Motion => ({
  x,
  y: null,
  sit: 1,
  yaw: 0,
  gait: 0,
  run: 0,
  cycle: 0,
  idle: 0,
  rise,
  jumpBlend: 0,
  clip: 0,
  point: 0,
  pointTime: 0,
  side: 'L',
  flight: null,
});

const SIT_RATE = 1 / 0.45;
const BLEND_RATE = 1 / 0.2;
const TURN_RATE = 5.8;
const RISE_RATE = 1 / 0.12;
const FACING = 1.45;
/** Partly turned for a jump or on the card: it still reads as facing the viewer. */
const JUMP_FACING = 0.7;
const PERCHED_FACING = 0.35;

// The Jump clip, retimed: its own flight lasts only 0.32 s, too short for a real distance.
const ANTICIPATION = 0.32;
const LANDING = 0.32;
const CLIP_TAKEOFF = 0.18;
const CLIP_TOUCHDOWN = 0.5;
const CLIP_END = 0.705;

const POINT_RISE = 0.35;
const POINT_HOLD = 1.4;
const POINT_FALL = 0.35;
export const POINT_SECONDS = POINT_RISE + POINT_HOLD + POINT_FALL;

const toward = (value: number, target: number, step: number) =>
  value < target ? Math.min(target, value + step) : Math.max(target, value - step);

const smooth = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** How far the Jump clip reaches above the feet at a clip time, as a multiple of the height. */
export function jumpTop(clip: number): number {
  const air = smooth(0.1, 0.24, clip) * (1 - smooth(0.42, 0.56, clip));
  return 1.003 + 0.31 * air;
}

export interface MotionGoal {
  phase: NavPhase;
  /** Where this phase is heading on the page. */
  targetX: number;
  size: number;
  /** Whether a focus ring wants the character above it. */
  riseTo: boolean;
  /** This trip's gait, decided once from the menu (anchors.ts). */
  run: boolean;
  /** The current phase's token: a flight with an older one must change course. */
  token: number;
  /** Where the feet are on the nav line right now. */
  navY: number;
  /** Where a flight, or the time on the card, is heading. Null on the nav. */
  dest: Point | null;
  /** Where the flight ends: on the card, or back on the nav line. */
  goal: 'nav' | 'card';
  side: 'L' | 'R';
  /** The card's centre x, to face while on it. */
  faceX: number;
}

function nextFlight(m: Motion, goal: MotionGoal, dest: Point): Flight {
  const here: Point = { x: m.x, y: m.y ?? goal.navY };
  const old = m.flight;
  if (
    old &&
    old.token === goal.token &&
    Math.hypot(old.arc.to.x - dest.x, old.arc.to.y - dest.y) < 0.5
  ) {
    return old;
  }
  // In the air: bend. Otherwise, a new jump from where it stands.
  if (old && old.wait === 0 && old.time < old.arc.duration) {
    return {
      token: goal.token,
      arc: bendArc(here, arcVelocity(old.arc, old.time), dest),
      time: 0,
      wait: 0,
      landed: 0,
      clipFrom: m.clip,
    };
  }
  return {
    token: goal.token,
    arc: makeArc(here, dest, goal.size),
    time: 0,
    wait: ANTICIPATION,
    landed: 0,
    clipFrom: 0,
  };
}

/** Advances by `dt` seconds. `done` says the phase's goal has been reached. */
export function stepMotion(
  m: Motion,
  goal: MotionGoal,
  dt: number,
): { motion: Motion; done: boolean } {
  const { phase, targetX, size, riseTo, dest } = goal;
  const amount = goal.goal === 'card' ? JUMP_FACING : FACING;
  const facing = Math.sign(targetX - m.x) * amount;
  const next: Motion = {
    ...m,
    idle: m.idle + dt,
    rise: toward(m.rise, riseTo ? 1 : 0, RISE_RATE * dt),
    point: toward(m.point, 0, (1 / POINT_FALL) * dt),
    jumpBlend: toward(m.jumpBlend, 0, BLEND_RATE * dt),
  };

  switch (phase) {
    case 'seated':
      next.x = targetX;
      next.y = null;
      next.sit = toward(m.sit, 1, SIT_RATE * dt);
      next.yaw = toward(m.yaw, 0, TURN_RATE * dt);
      next.gait = toward(m.gait, 0, BLEND_RATE * dt);
      return { motion: next, done: false };

    case 'standing':
      next.sit = toward(m.sit, 0, SIT_RATE * dt);
      // Turn only once mostly up: the seated legs point at the viewer.
      if (next.sit < 0.5) next.yaw = toward(m.yaw, facing, TURN_RATE * dt);
      next.gait = toward(m.gait, 0, BLEND_RATE * dt);
      return { motion: next, done: next.sit === 0 && next.yaw === facing };

    case 'walking':
      next.run = toward(m.run, goal.run ? 1 : 0, BLEND_RATE * dt);
      next.x = toward(m.x, targetX, gaitSpeed(next.run, size) * dt);
      next.sit = toward(m.sit, 0, SIT_RATE * dt);
      next.yaw = toward(m.yaw, facing, TURN_RATE * dt);
      next.gait = toward(m.gait, 1, BLEND_RATE * dt);
      next.cycle = m.cycle + dt;
      return { motion: next, done: next.x === targetX };

    case 'sitting':
      next.gait = toward(m.gait, 0, BLEND_RATE * dt);
      next.yaw = toward(m.yaw, 0, TURN_RATE * dt);
      next.cycle = m.cycle + dt;
      if (next.yaw === 0 && next.gait === 0) next.sit = toward(m.sit, 1, SIT_RATE * dt);
      return { motion: next, done: next.sit === 1 };

    case 'jumping': {
      if (!dest) return { motion: next, done: true };
      const flight = { ...nextFlight(m, goal, dest) };
      next.sit = toward(m.sit, 0, SIT_RATE * dt);
      next.gait = toward(m.gait, 0, BLEND_RATE * dt);
      next.jumpBlend = toward(m.jumpBlend, 1, BLEND_RATE * dt);
      next.yaw = toward(m.yaw, Math.sign(dest.x - m.x) * JUMP_FACING, TURN_RATE * dt);
      let done = false;
      if (flight.wait > 0) {
        flight.wait = Math.max(0, flight.wait - dt);
        const progress = 1 - flight.wait / ANTICIPATION;
        next.clip = flight.clipFrom + (CLIP_TAKEOFF - flight.clipFrom) * progress;
      } else if (flight.time < flight.arc.duration) {
        flight.time = Math.min(flight.arc.duration, flight.time + dt);
        const from = Math.max(flight.clipFrom, CLIP_TAKEOFF);
        next.clip = from + (CLIP_TOUCHDOWN - from) * (flight.time / flight.arc.duration);
      } else {
        flight.landed += dt;
        next.clip =
          CLIP_TOUCHDOWN + (CLIP_END - CLIP_TOUCHDOWN) * Math.min(1, flight.landed / LANDING);
        done = flight.landed >= LANDING;
      }
      const position = sampleArc(flight.arc, flight.time);
      next.x = position.x;
      next.y = position.y;
      next.flight = flight;
      if (done) {
        next.flight = null;
        next.y = goal.goal === 'nav' ? null : position.y;
        next.pointTime = 0;
        next.idle = 0;
      }
      return { motion: next, done };
    }

    case 'pointing':
    case 'perched': {
      if (!dest) return { motion: next, done: false };
      next.x = dest.x;
      next.y = dest.y;
      next.side = goal.side;
      next.yaw = toward(m.yaw, Math.sign(goal.faceX - dest.x) * PERCHED_FACING, TURN_RATE * dt);
      if (phase === 'perched') return { motion: next, done: false };
      next.pointTime = m.pointTime + dt;
      next.point =
        smooth(0, POINT_RISE, next.pointTime) *
        (1 - smooth(POINT_RISE + POINT_HOLD, POINT_SECONDS, next.pointTime));
      return { motion: next, done: next.pointTime >= POINT_SECONDS };
    }
  }
}

/** The eased sit used for the pose and the feet, so both move together. */
export const easeSit = (sit: number) => sit * sit * (3 - 2 * sit);
