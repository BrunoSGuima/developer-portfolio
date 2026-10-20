import { describe, expect, it } from 'vitest';
import { facingToward, laneTargetX, MASCOT_WIDTH, walkDuration } from './geometry.ts';

describe('laneTargetX', () => {
  it('centres the mascot over the target', () => {
    const x = laneTargetX({ left: 500, width: 80 }, { left: 100, width: 1000 });

    expect(x).toBe(500 + 40 - 100 - MASCOT_WIDTH / 2);
  });

  // Lane widths for 768px and 1280px viewports (content column minus gutters).
  it.each([704, 1216])('stays inside a %ipx lane, whatever the target', (laneWidth) => {
    const lane = { left: 32, width: laneWidth };
    const far = [-500, 0, 32, laneWidth / 2, laneWidth, laneWidth + 32, 5000];

    for (const left of far) {
      const x = laneTargetX({ left, width: 60 }, lane);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + MASCOT_WIDTH).toBeLessThanOrEqual(laneWidth);
    }
  });

  it('never returns a negative position, even for a lane narrower than the mascot', () => {
    expect(laneTargetX({ left: 0, width: 10 }, { left: 0, width: 20 })).toBe(0);
  });
});

describe('walkDuration', () => {
  it('grows with distance, between 300 and 1200ms', () => {
    expect(walkDuration(0, 10)).toBe(300);
    expect(walkDuration(0, 400)).toBe(600);
    expect(walkDuration(1000, 0)).toBe(1200);
  });
});

describe('facingToward', () => {
  it('faces left when the target is to the left, otherwise right', () => {
    expect(facingToward(100, 400)).toBe('left');
    expect(facingToward(700, 400)).toBe('right');
  });
});
