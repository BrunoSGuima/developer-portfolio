import type { CharacterMetrics } from './character/contract.ts';

/**
 * Geometry of the character on the nav. All values are document pixels (the header scrolls with the
 * page, so the character is positioned in the document and never needs a scroll listener).
 */

/** The character's default standing height, set by the owner. */
export const TARGET_SIZE = 48;

/** Pixels the character may never leave between its head and the top of the page. */
export const HEAD_MARGIN = 1;

/**
 * How far a nav link's focus ring extends outside its box while the 3D character is active: its 3px
 * outline (styles/global.css) plus the -5px offset in mascot3d.css, which keeps the ring inside the
 * link's padding. Negative: inside the box. Kept in step with both files by a test.
 */
export const NAV_RING_OUTSET = -2;

/** Pixels between the character's lowest point and the ink of the nav labels when it rests there. */
export const LABEL_GAP = 2;

export interface NavAnchor {
  /** The active link's centre. */
  x: number;
  /** Where the lowest pixel normally rests: just above the nav labels' ink. */
  restLine: number;
  /** Where it rises to while a focus ring would touch it: sitting just on top of the ring. */
  ringLine: number;
  /** The character's standing height. */
  size: number;
  /** The active character's measurements. */
  metrics: CharacterMetrics;
  /** The centres of the nav's items, in menu order. */
  items: readonly number[];
  /** Which of them is the active link. */
  activeIndex: number;
  /** The centres of the first and last items: where a jump back lands on the nav. */
  spanLeft: number;
  spanRight: number;
}

interface LinkGeometry {
  left: number;
  width: number;
  /** Top of the link's box. */
  top: number;
  /** Top of the nav labels' ink. */
  inkTop: number;
  metrics: CharacterMetrics;
  /** The centres of the nav's items in menu order, and which is active, when known. */
  items?: readonly number[];
  activeIndex?: number;
}

export function anchorFrom({
  left,
  width,
  top,
  inkTop,
  metrics,
  items,
  activeIndex = 0,
}: LinkGeometry): NavAnchor {
  const ringLine = top - NAV_RING_OUTSET - 1;
  // Every pose must fit above the ring. A future layout shrinks the character instead of cutting off
  // its head.
  const size = Math.min(
    TARGET_SIZE,
    (ringLine - HEAD_MARGIN) / metrics.standingTop,
    (ringLine - HEAD_MARGIN) / (metrics.seatedTop - metrics.seatedBottom),
  );
  const x = left + width / 2;
  return {
    x,
    restLine: inkTop - LABEL_GAP,
    ringLine,
    size,
    metrics,
    items: items ?? [x],
    activeIndex,
    spanLeft: items?.[0] ?? x,
    spanRight: items?.at(-1) ?? x,
  };
}

let metrics: CanvasRenderingContext2D | null = null;

/**
 * The top of a link's ink, from its font: the text's box is the font's content area, so the baseline
 * is its top plus the font's ascent. Matches the rendered pixels within 1 px in both languages.
 */
function labelInkTop(link: Element, doc: Document): number {
  const range = doc.createRange();
  range.selectNodeContents(link);
  const text = range.getBoundingClientRect();
  metrics ??= doc.createElement('canvas').getContext('2d');
  if (!metrics) return text.top;
  const style = getComputedStyle(link);
  metrics.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const measured = metrics.measureText(link.textContent);
  return text.top + measured.fontBoundingBoxAscent - measured.actualBoundingBoxAscent;
}

/** The active nav link in document coordinates; null when there is none, or it isn't displayed. */
export function measureNavAnchor(
  metrics: CharacterMetrics,
  doc: Document = document,
): NavAnchor | null {
  // Data attributes, not labels: the accessible names are translated.
  // Only the menu's own items: its panel can also hold the language switcher.
  const links = [...doc.querySelectorAll('[data-nav="main"] ul > li > a')].filter(
    (link) => link.getBoundingClientRect().width > 0,
  );
  const active = links.find((link) => link.getAttribute('aria-current') === 'page');
  if (!active) return null;
  const box = active.getBoundingClientRect();
  const scrollX = doc.defaultView?.scrollX ?? 0;
  const scrollY = doc.defaultView?.scrollY ?? 0;
  return anchorFrom({
    metrics,
    left: box.left + scrollX,
    width: box.width,
    top: box.top + scrollY,
    // The highest of all the labels, so the height never changes along the nav.
    inkTop: Math.min(...links.map((link) => labelInkTop(link, doc))) + scrollY,
    items: links.map((link) => {
      const rect = link.getBoundingClientRect();
      return rect.left + rect.width / 2 + scrollX;
    }),
    activeIndex: links.indexOf(active),
  });
}

export interface RingBox {
  left: number;
  right: number;
  top: number;
}

/** The ring of the focused element in the header, in document coordinates, if it is showing. */
export function measureFocusRing(doc: Document = document): RingBox | null {
  const focused = doc.activeElement;
  if (!focused?.closest('header') || !focused.matches(':focus-visible')) return null;
  const box = focused.getBoundingClientRect();
  const style = getComputedStyle(focused);
  // From the element's own styles: other header controls keep the site's wider ring.
  const outset = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
  const scrollX = doc.defaultView?.scrollX ?? 0;
  const scrollY = doc.defaultView?.scrollY ?? 0;
  return {
    left: box.left + scrollX - outset,
    right: box.right + scrollX + outset,
    top: box.top + scrollY - outset,
  };
}

// Added to half the character's width: the distance it covers while it rises, so a moving character
// is already above a ring when it gets there.
const RISE_LEAD = 0.4;

/** Whether the character at `x` would touch this ring if it stayed on its rest line. */
export function ringReaches(ring: RingBox | null, x: number, anchor: NavAnchor): boolean {
  if (!ring || ring.top >= anchor.restLine) return false;
  const reach = (anchor.metrics.halfWidth + RISE_LEAD) * anchor.size;
  return x + reach > ring.left && x - reach < ring.right;
}

/**
 * The lowest the page lets the head go: returns feet low enough for the head to stay on the page.
 * `poseTop` is how far the pose reaches above its feet, as a multiple of its height. During a jump
 * (M3) this makes the root descend while the clip rises, so the head stays on the page and the legs
 * appear to tuck.
 */
export function headSafeFeetY(feetY: number, poseTop: number, size: number): number {
  return Math.max(feetY, poseTop * size + HEAD_MARGIN);
}

/**
 * Feet position for a pose between standing (sit 0) and seated (sit 1), `rise` of the way up to the
 * ring line. The seated pose reaches below its feet plane, so the plane moves until that lowest pixel
 * rests on the line. Halfway through sitting the bent limbs reach lower still, so the character lifts
 * by as much.
 */
export function feetY(anchor: NavAnchor, sit: number, rise = 0): number {
  const { standingTop, seatedTop, seatedBottom, sitBulge } = anchor.metrics;
  const line = anchor.restLine + (anchor.ringLine - anchor.restLine) * rise;
  const seatedPlane = line + seatedBottom * anchor.size;
  const bulge = sitBulge * anchor.size * 4 * sit * (1 - sit);
  const top = standingTop + (seatedTop - standingTop) * sit;
  return headSafeFeetY(line + (seatedPlane - line) * sit - bulge, top, anchor.size);
}

/**
 * Walk or run, decided by the menu and not by distance, so every item behaves alike however wide its
 * label: next-door items walk, and anything further runs. From wherever the character is, it counts
 * from the nearest item, which also covers a landing from the card or a trip already under way.
 */
export function tripRuns(fromX: number, { items, activeIndex }: NavAnchor): boolean {
  let nearest = 0;
  items.forEach((item, index) => {
    if (Math.abs(item - fromX) < Math.abs((items[nearest] ?? item) - fromX)) nearest = index;
  });
  return Math.abs(activeIndex - nearest) > 1;
}

/** Document pixels per second. `run` blends, so a change of gait mid-trip never jerks. */
export const gaitSpeed = (run: number, size: number, { walkSpeed, runSpeed }: CharacterMetrics) =>
  (walkSpeed + (runSpeed - walkSpeed) * run) * size;
