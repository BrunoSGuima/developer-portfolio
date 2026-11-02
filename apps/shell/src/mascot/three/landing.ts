import type { CharacterMetrics } from './character/contract.ts';

/** Where the character can stand on the Fun Fact card. All values are document pixels. */

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CardLanding {
  x: number;
  /** The card's top edge: where the feet rest. */
  y: number;
  /** The arm that points at the card's content. L is the viewer's right, R the viewer's left. */
  side: 'L' | 'R';
}

export interface LandingInput {
  card: Box;
  /** Everything he must not touch: the 2D mascots and the header's controls. */
  obstacles: readonly Box[];
  /** The active link's x: the nearest free spot makes the shortest jump. */
  fromX: number;
  size: number;
  metrics: CharacterMetrics;
}

/** Pixels kept between the character and anything else. */
const CLEARANCE = 4;

/** The free spot nearest `fromX`, or null if nothing fits and the character should stay on the nav. */
export function resolveLanding({
  card,
  obstacles,
  fromX,
  size,
  metrics,
}: LandingInput): CardLanding | null {
  const min = card.left + metrics.halfWidth * size + CLEARANCE;
  const max = card.right - metrics.halfWidth * size - CLEARANCE;
  if (min > max) return null;

  const headTop = card.top - metrics.standingTop * size - CLEARANCE;
  const reach = metrics.pointReach * size + CLEARANCE;
  const blocked = obstacles
    .filter((box) => box.bottom > headTop && box.top < card.top)
    .map((box) => [box.left - reach, box.right + reach] as const)
    .sort((a, b) => a[0] - b[0]);

  const free: (readonly [number, number])[] = [];
  let start = min;
  for (const [left, right] of blocked) {
    if (left > start) free.push([start, Math.min(left, max)]);
    start = Math.max(start, right);
  }
  if (start <= max) free.push([start, max]);

  let best: number | null = null;
  for (const [left, right] of free) {
    if (left > right) continue;
    const x = Math.min(right, Math.max(left, fromX));
    if (best === null || Math.abs(x - fromX) < Math.abs(best - fromX)) best = x;
  }
  if (best === null) return null;
  return { x: best, y: card.top, side: best < (card.left + card.right) / 2 ? 'L' : 'R' };
}

const toDocument = (box: DOMRect, doc: Document): Box => {
  const scrollX = doc.defaultView?.scrollX ?? 0;
  const scrollY = doc.defaultView?.scrollY ?? 0;
  return {
    left: box.left + scrollX,
    right: box.right + scrollX,
    top: box.top + scrollY,
    bottom: box.bottom + scrollY,
  };
};

/**
 * The header's visible controls. Links count as their text plus the active underline: their box's
 * empty padding may be crossed, which matters on Home's tightest layout.
 */
function headerObstacles(doc: Document): Box[] {
  const boxes: Box[] = [];
  for (const element of doc.querySelectorAll('header a, header button')) {
    if (element.getBoundingClientRect().width === 0) continue;
    if (element.tagName !== 'A') {
      boxes.push(toDocument(element.getBoundingClientRect(), doc));
      continue;
    }
    const range = doc.createRange();
    range.selectNodeContents(element);
    const text = toDocument(range.getBoundingClientRect(), doc);
    boxes.push({ ...text, bottom: text.bottom + 5 });
  }
  return boxes;
}

/** The landing for the page as it is laid out right now. */
export function measureLanding(
  fromX: number,
  size: number,
  metrics: CharacterMetrics,
  doc: Document = document,
): CardLanding | null {
  const card = doc.querySelector('[data-fun-fact]');
  if (!card) return null;
  const mascots2d = [...doc.querySelectorAll('[data-slot="peek"], [data-slot="presenter"]')].map(
    (element) => toDocument(element.getBoundingClientRect(), doc),
  );
  return resolveLanding({
    card: toDocument(card.getBoundingClientRect(), doc),
    obstacles: [...mascots2d, ...headerObstacles(doc)],
    fromX,
    size,
    metrics,
  });
}
