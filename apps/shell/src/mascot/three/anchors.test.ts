import { describe, expect, it } from 'vitest';
import global from '../../styles/global.css?raw';
import mascot3d from './mascot3d.css?raw';
import {
  anchorFrom,
  feetY,
  gaitSpeed,
  HEAD_MARGIN,
  headSafeFeetY,
  LABEL_GAP,
  NAV_RING_OUTSET,
  type NavAnchor,
  POSE,
  ringReaches,
  TARGET_SIZE,
  tripRuns,
} from './anchors.ts';

// Measured on the real site: link box top and the top of the labels' ink, from their pixels.
const LAYOUTS = [
  { name: '1024 px and up', top: 57.05, inkTop: 70 },
  { name: '800 px, English', top: 65.78, inkTop: 79 },
  { name: '800 px, Portuguese', top: 56, inkTop: 69 },
];

const anchorAt = (top: number, inkTop: number) => anchorFrom({ left: 400, width: 70, top, inkTop });

describe('the nav focus ring constant', () => {
  it('matches the outline in global.css and the offset in mascot3d.css', () => {
    const rule = /:focus-visible \{[^}]*\}/.exec(global)?.[0] ?? '';
    const outline = Number(/outline: (\d+)px/.exec(rule)?.[1]);
    const offset = Number(/outline-offset: (-?\d+)px/.exec(mascot3d)?.[1]);
    expect(outline + offset).toBe(NAV_RING_OUTSET);
  });
});

describe('the default size', () => {
  it('is 48 px', () => {
    expect(TARGET_SIZE).toBe(48);
  });
});

const lowestPoint = (anchor: NavAnchor, sit: number, rise: number) =>
  feetY(anchor, sit, rise) - POSE.seatedBottom * sit * anchor.size;

describe.each(LAYOUTS)('anchorFrom, $name', ({ top, inkTop }) => {
  const anchor = anchorAt(top, inkTop);
  const ringTop = top - NAV_RING_OUTSET;
  const poses = [0, 0.25, 0.5, 0.75, 1];

  it('keeps the default size', () => {
    expect(anchor.size).toBe(TARGET_SIZE);
  });

  it('rests just above the label’s ink, in every pose', () => {
    expect(lowestPoint(anchor, 1, 0)).toBeCloseTo(inkTop - LABEL_GAP);
    for (const sit of poses) {
      expect(lowestPoint(anchor, sit, 0)).toBeLessThanOrEqual(inkTop - LABEL_GAP + 1e-9);
    }
  });

  it('rises above the focus ring, in every pose', () => {
    for (const sit of poses) {
      expect(lowestPoint(anchor, sit, 1)).toBeLessThan(ringTop);
    }
  });

  it('keeps every pose on the page, risen or not', () => {
    for (const sit of poses) {
      for (const rise of [0, 1]) {
        const reach = POSE.standingTop + (POSE.seatedTop - POSE.standingTop) * sit;
        expect(feetY(anchor, sit, rise) - reach * anchor.size).toBeGreaterThanOrEqual(
          HEAD_MARGIN - 1e-9,
        );
      }
    }
  });
});

describe('anchorFrom', () => {
  it('centres on the link', () => {
    expect(anchorAt(57, 70).x).toBe(435);
  });

  it('shrinks the character when a layout leaves too little room', () => {
    const anchor = anchorAt(30, 40);
    expect(anchor.size).toBeLessThan(TARGET_SIZE);
    expect(feetY(anchor, 0, 1) - POSE.standingTop * anchor.size).toBeGreaterThanOrEqual(0);
  });
});

describe('ringReaches', () => {
  const anchor = anchorAt(57, 70);
  const ring = { left: 402, right: 468, top: 59 };

  it('is false with no ring', () => {
    expect(ringReaches(null, 435, anchor)).toBe(false);
  });

  it('is true for the ring of the link it sits on', () => {
    expect(ringReaches(ring, 435, anchor)).toBe(true);
  });

  it('is false for a ring far along the nav', () => {
    expect(ringReaches(ring, 700, anchor)).toBe(false);
  });

  it('starts before a moving character arrives at the ring', () => {
    expect(ringReaches(ring, 402 - 0.5 * anchor.size, anchor)).toBe(true);
  });

  it('is false for a ring below where it rests', () => {
    expect(ringReaches({ ...ring, top: anchor.restLine + 1 }, 435, anchor)).toBe(false);
  });
});

describe('headSafeFeetY', () => {
  it('leaves feet alone when the head is already on the page', () => {
    expect(headSafeFeetY(100, 1, 48)).toBe(100);
  });

  it('lowers the feet just enough to keep the head on the page', () => {
    expect(headSafeFeetY(51, 1.303, 48)).toBeCloseTo(1.303 * 48 + HEAD_MARGIN);
  });

  it('protects the highest point of the temporary model’s Jump at the default size', () => {
    const feet = headSafeFeetY(51, 1.303, TARGET_SIZE);
    expect(feet - 1.303 * TARGET_SIZE).toBeGreaterThanOrEqual(HEAD_MARGIN - 1e-9);
  });
});

describe('tripRuns', () => {
  // The real menu at 1280 px: Home, About, Projects, Architecture, Contact. Spacing varies with the
  // labels' widths: Projects → Architecture is the longest next-door hop.
  const ITEMS = [687, 759, 840, 943, 1047];
  const on = (activeIndex: number): NavAnchor => ({
    ...anchorFrom({ left: 0, width: 0, top: 57, inkTop: 70, items: ITEMS, activeIndex }),
  });
  const NAMES = ['Home', 'About', 'Projects', 'Architecture', 'Contact'];

  for (let from = 0; from < ITEMS.length; from += 1) {
    for (let to = 0; to < ITEMS.length; to += 1) {
      const between = Math.abs(from - to) - 1;
      const gait = between >= 1 ? 'runs' : 'walks';
      it(`${NAMES[from]} → ${NAMES[to]} ${gait}`, () => {
        expect(tripRuns(ITEMS[from]!, on(to))).toBe(between >= 1);
      });
    }
  }

  it('is decided by menu position, not distance: the longest next-door hop walks', () => {
    const wide = [100, 900, 1000];
    const anchor = { ...on(0), items: wide, activeIndex: 1 };
    expect(tripRuns(100, anchor)).toBe(false);
  });

  it('and a short hop over one item runs', () => {
    const tight = [100, 130, 160];
    const anchor = { ...on(0), items: tight, activeIndex: 2 };
    expect(tripRuns(100, anchor)).toBe(true);
  });

  it('counts from the nearest item when between items', () => {
    // Between About and Projects, nearer Projects: Architecture is next door
    expect(tripRuns(820, on(3))).toBe(false);
    // Nearer About: Architecture is two away
    expect(tripRuns(770, on(3))).toBe(true);
  });

  it('from a landing beyond the last item, counts from the last item', () => {
    expect(tripRuns(1115, on(3))).toBe(false);
    expect(tripRuns(1115, on(2))).toBe(true);
  });
});

describe('gaitSpeed', () => {
  it('matches each clip so the feet do not slide', () => {
    expect(gaitSpeed(0, 48)).toBeCloseTo(1.05 * 48);
    expect(gaitSpeed(1, 48)).toBeCloseTo(2.4 * 48);
  });

  it('blends between them', () => {
    expect(gaitSpeed(0.5, 48)).toBeCloseTo(((1.05 + 2.4) / 2) * 48);
  });
});
