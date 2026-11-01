import { describe, expect, it } from 'vitest';
import { arcVelocity, bendArc, makeArc, sampleArc } from './arc.ts';

const FROM = { x: 700, y: 68 };
const TO = { x: 1100, y: 274 };

describe('makeArc', () => {
  const arc = makeArc(FROM, TO, 48);

  it('starts and ends at the given points', () => {
    expect(sampleArc(arc, 0)).toEqual(FROM);
    expect(sampleArc(arc, arc.duration)).toEqual(TO);
  });

  it('hops above the higher end', () => {
    expect(arc.control.y).toBeLessThan(FROM.y);
    expect(sampleArc(arc, arc.duration * 0.1).y).toBeLessThan(FROM.y);
  });

  it('takes longer for longer distances, within limits', () => {
    expect(makeArc(FROM, { x: 710, y: 68 }, 48).duration).toBe(0.5);
    expect(makeArc(FROM, { x: 3000, y: 68 }, 48).duration).toBe(0.9);
    expect(arc.duration).toBeGreaterThan(0.5);
  });

  it('never leaves the ends’ range sideways', () => {
    for (let i = 0; i <= 10; i += 1) {
      const { x } = sampleArc(arc, (arc.duration * i) / 10);
      expect(x).toBeGreaterThanOrEqual(FROM.x);
      expect(x).toBeLessThanOrEqual(TO.x);
    }
  });
});

describe('bendArc', () => {
  const original = makeArc(FROM, TO, 48);
  const time = original.duration * 0.4;
  const position = sampleArc(original, time);
  const velocity = arcVelocity(original, time);
  const bent = bendArc(position, velocity, { x: 500, y: 68 });

  it('starts exactly where the character is', () => {
    expect(sampleArc(bent, 0)).toEqual(position);
  });

  it('keeps the velocity it had', () => {
    const start = arcVelocity(bent, 0);
    expect(start.x).toBeCloseTo(velocity.x);
    expect(start.y).toBeCloseTo(velocity.y);
  });

  it('ends at the new destination', () => {
    expect(sampleArc(bent, bent.duration)).toEqual({ x: 500, y: 68 });
  });
});
