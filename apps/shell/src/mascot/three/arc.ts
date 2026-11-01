/** A flight between two points of the page, in document pixels: a quadratic curve over time. */

export interface Point {
  x: number;
  y: number;
}

export interface Arc {
  from: Point;
  control: Point;
  to: Point;
  /** Seconds. */
  duration: number;
}

const flightTime = (from: Point, to: Point) =>
  Math.min(0.9, Math.max(0.5, 0.45 + Math.hypot(to.x - from.x, to.y - from.y) / 1000));

/** A new jump, with a hop above the higher end. Head safety is applied on top (anchors.ts). */
export function makeArc(from: Point, to: Point, size: number): Arc {
  const hop = size * 0.5;
  return {
    from,
    to,
    control: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - hop },
    duration: flightTime(from, to),
  };
}

export function sampleArc({ from, control, to, duration }: Arc, time: number): Point {
  const t = Math.min(1, Math.max(0, time / duration));
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

/** Document pixels per second. */
export function arcVelocity({ from, control, to, duration }: Arc, time: number): Point {
  const t = Math.min(1, Math.max(0, time / duration));
  const u = 1 - t;
  return {
    x: (2 * (u * (control.x - from.x) + t * (to.x - control.x))) / duration,
    y: (2 * (u * (control.y - from.y) + t * (to.y - control.y))) / duration,
  };
}

/**
 * A flight interrupted in the air: starts where the character is, moving as it was moving, and curves
 * to the new destination. Neither position nor velocity jumps.
 */
export function bendArc(position: Point, velocity: Point, to: Point): Arc {
  const duration = flightTime(position, to);
  return {
    from: position,
    to,
    control: {
      x: position.x + (velocity.x * duration) / 2,
      y: position.y + (velocity.y * duration) / 2,
    },
    duration,
  };
}
