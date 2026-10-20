import type { Facing } from './machine.ts';

/** Sprite size in px; keep in sync with --mascot-width / --mascot-height in tokens.css. */
export const MASCOT_WIDTH = 36;

const MIN_WALK_MS = 300;
const MAX_WALK_MS = 1200;
const WALK_MS_PER_PX = 1.5;

interface HorizontalRect {
  left: number;
  width: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Lane offset that centres the mascot over `target` (e.g. the active nav link), clamped so the
 * mascot never leaves the lane (and therefore never causes horizontal overflow).
 */
export function laneTargetX(target: HorizontalRect, lane: HorizontalRect): number {
  const centred = target.left + target.width / 2 - lane.left - MASCOT_WIDTH / 2;
  return Math.round(clamp(centred, 0, Math.max(0, lane.width - MASCOT_WIDTH)));
}

/** Walk duration grows with distance, within sensible bounds. */
export function walkDuration(fromX: number, toX: number): number {
  return clamp(Math.abs(toX - fromX) * WALK_MS_PER_PX, MIN_WALK_MS, MAX_WALK_MS);
}

/** Which way to face so the mascot looks (and points) toward a target. */
export function facingToward(targetCentreX: number, mascotCentreX: number): Facing {
  return targetCentreX < mascotCentreX ? 'left' : 'right';
}
