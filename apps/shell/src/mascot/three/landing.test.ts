import { describe, expect, it } from 'vitest';
import { robot } from './character/robot/profile.ts';
import { type Box, resolveLanding } from './landing.ts';

const SIZE = 48;
const box = (left: number, top: number, right: number, bottom: number): Box => ({
  left,
  top,
  right,
  bottom,
});

// Measured on the real site (poc/mascot-3d/M3-REPORT.md)
const ABOUT_1280 = { card: box(864, 274, 1216, 524), peek: box(873, 156, 1081, 282), linkX: 759 };
const ABOUT_800 = { card: box(128, 248, 768, 409), peek: box(253, 157, 413, 254), linkX: 437 };
const HOME_1280 = {
  card: box(803, 156, 1224, 368),
  presenter: box(656, 236, 1017, 661),
  linkX: 687,
};

const reach = 0.62 * SIZE + 4;

describe('resolveLanding', () => {
  it('lands on the card’s top edge, inside its span', () => {
    const landing = resolveLanding({
      card: HOME_1280.card,
      obstacles: [],
      fromX: 1000,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(landing).toEqual({ x: 1000, y: 156, side: 'L' });
  });

  it('picks the spot nearest the link, keeping its body on the card', () => {
    const landing = resolveLanding({
      card: HOME_1280.card,
      obstacles: [],
      fromX: 0,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(landing?.x).toBeCloseTo(803 + 0.36 * SIZE + 4);
  });

  it('avoids the 2D peeking mascot, leaving room for its arm', () => {
    const { card, peek, linkX } = ABOUT_1280;
    const landing = resolveLanding({
      card,
      obstacles: [peek],
      fromX: linkX,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(landing?.x).toBeCloseTo(peek.right + reach);
    expect(landing?.x).toBeLessThanOrEqual(card.right);
  });

  it('goes to whichever side of the peeking mascot is nearer', () => {
    const { card, peek } = ABOUT_800;
    const left = resolveLanding({
      card,
      obstacles: [peek],
      fromX: 150,
      size: SIZE,
      metrics: robot.metrics,
    });
    const right = resolveLanding({
      card,
      obstacles: [peek],
      fromX: 700,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(left?.x).toBeLessThanOrEqual(peek.left - reach);
    expect(right?.x).toBe(700);
  });

  it('ignores obstacles that are not at his height, like the Home presenter', () => {
    const { card, presenter, linkX } = HOME_1280;
    const landing = resolveLanding({
      card,
      obstacles: [presenter],
      fromX: linkX,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(landing?.x).toBeCloseTo(803 + 0.36 * SIZE + 4);
  });

  it('avoids header controls at his height: the tight Home layout at 800 px in Portuguese', () => {
    const card = box(128, 138, 768, 323);
    const links = box(341, 66, 768, 98);
    const landing = resolveLanding({
      card,
      obstacles: [links],
      fromX: 374,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(landing?.x).toBeLessThanOrEqual(links.left - reach);
    expect(landing?.x).toBeGreaterThanOrEqual(card.left);
  });

  it('returns null when nothing fits, so he stays on the nav', () => {
    const card = box(128, 138, 768, 323);
    const wall = box(0, 100, 2000, 200);
    expect(
      resolveLanding({ card, obstacles: [wall], fromX: 374, size: SIZE, metrics: robot.metrics }),
    ).toBeNull();
  });

  it('returns null on a card too narrow for him', () => {
    const card = box(100, 200, 130, 300);
    expect(
      resolveLanding({ card, obstacles: [], fromX: 110, size: SIZE, metrics: robot.metrics }),
    ).toBeNull();
  });

  it('merges overlapping obstacles', () => {
    const card = box(0, 200, 1000, 300);
    const obstacles = [box(100, 100, 400, 210), box(300, 100, 700, 210)];
    const landing = resolveLanding({
      card,
      obstacles,
      fromX: 500,
      size: SIZE,
      metrics: robot.metrics,
    });
    expect(landing?.x).toBeCloseTo(700 + reach);
  });

  it('points with the arm on the side of the card’s centre', () => {
    const card = box(0, 200, 1000, 300);
    expect(
      resolveLanding({ card, obstacles: [], fromX: 200, size: SIZE, metrics: robot.metrics })?.side,
    ).toBe('L');
    expect(
      resolveLanding({ card, obstacles: [], fromX: 800, size: SIZE, metrics: robot.metrics })?.side,
    ).toBe('R');
  });
});
