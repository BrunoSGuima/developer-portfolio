import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { liveSections, type Section } from '../sections/registry.ts';
import { createFakeSectionApp } from '../test/fakeSectionApp.ts';
import { setMedia } from '../test/media.ts';
import { renderRoute, ROUTE_WAIT } from '../test/renderRoute.tsx';
import { MASCOT_WIDTH, walkDuration } from './geometry.ts';
import { ARRIVAL_FALLBACK_MARGIN_MS, POINT_MS } from './useMascotTimers.ts';

// jsdom has no layout: stub where things are. Nav links sit side by side in a 1216px lane.
const LINK_LEFT: Record<string, number> = {
  Home: 600,
  About: 700,
  Projects: 800,
  Architecture: 900,
  Contact: 1000,
  // Portuguese labels have other widths, so the active link sits elsewhere.
  Sobre: 720,
};
const LINK_WIDTH = 80;
const LANE_WIDTH = 1216;
/** Lane offset that centres the mascot over a nav link. */
const over = (label: string) => LINK_LEFT[label]! + LINK_WIDTH / 2 - MASCOT_WIDTH / 2;

let walkerLeft = 0;
let card = { left: 300, width: 400 }; // centre 500: left of every nav item

const rect = (left: number, width = 0) =>
  ({ left, width, x: left, right: left + width, top: 0, y: 0, bottom: 0, height: 0 }) as DOMRect;

/** Pages that load instantly, so navigation settles inside act() even with fake timers. */
const eagerSections: Section[] = liveSections.map((section) => ({
  ...section,
  mount: {
    kind: 'react',
    load: () => Promise.resolve({ default: () => <h1>{section.title.en}</h1> }),
  },
}));

async function renderShell(path = '/', sections: Section[] = eagerSections) {
  const view = renderRoute(path, { sections });
  await screen.findByRole('heading', { level: 1 }, ROUTE_WAIT);
  // Let React finish the work the async first render scheduled (e.g. the mascot's placement)
  // before faking timers, then fake only the kind of timer the mascot uses.
  await act(async () => {});
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const go = (to: string) => act(() => view.router.navigate(to));
  return { ...view, go };
}

const lane = () => document.querySelector<HTMLElement>('[data-mascot="header"]')!;
const walker = () => lane().firstElementChild as HTMLElement;
const pose = () => walker().dataset.pose;
const facing = () => walker().dataset.facing;
const position = () => walker().style.transform;
const at = (label: string) => `translateX(${over(label)}px)`;
const endWalk = (propertyName = 'transform', target: Element = walker()) =>
  fireEvent.transitionEnd(target, { propertyName });
/** Only the header mascot uses timers (the stationary Fun Fact mascot has none). */
const HEADER_ONLY = 1;

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  walkerLeft = 0;
  card = { left: 300, width: 400 };
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.matches('[data-mascot="header"]')) return rect(0, LANE_WIDTH);
    if (this.parentElement?.matches('[data-mascot="header"]'))
      return rect(walkerLeft, MASCOT_WIDTH);
    if (this.matches('[data-nav="main"] a')) {
      return rect(LINK_LEFT[this.textContent ?? ''] ?? 0, LINK_WIDTH);
    }
    if (this.matches('[data-fun-fact]')) return rect(card.left, card.width);
    return rect(0);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HeaderMascot (desktop)', () => {
  it('is decorative: hidden from assistive technology, nothing focusable, ignores the pointer', async () => {
    await renderShell();

    expect(lane()).toHaveAttribute('aria-hidden', 'true');
    expect(lane().querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    expect(getComputedStyle(lane()).pointerEvents).toBe('none');
  });

  it('starts above the active item without walking', async () => {
    await renderShell('/');

    expect(pose()).toBe('idle');
    expect(position()).toBe(at('Home'));
    expect(walker().style.transitionDuration).toBe('0ms');
  });

  it('walks to the new item, points at the Fun Fact on arrival, then rests', async () => {
    const { go } = await renderShell('/');
    walkerLeft = over('Home');

    await go('/about');
    expect(pose()).toBe('walking');
    expect(facing()).toBe('right');
    expect(position()).toBe(at('About'));
    expect(walker().style.transitionDuration).toBe(
      `${walkDuration(over('Home'), over('About'))}ms`,
    );

    walkerLeft = over('About');
    endWalk();
    expect(pose()).toBe('pointing');

    advance(POINT_MS);
    expect(pose()).toBe('idle');
  });

  it('arrives via the fallback timer if transitionend never fires', async () => {
    const { go } = await renderShell('/');
    walkerLeft = over('Home');

    await go('/about');
    advance(walkDuration(over('Home'), over('About')) + ARRIVAL_FALLBACK_MARGIN_MS);

    expect(pose()).toBe('pointing');
  });

  it.each([
    ['left', { left: 300, width: 400 }],
    ['right', { left: 1100, width: 200 }],
  ])('turns %s to face the Fun Fact card when pointing', async (expected, cardRect) => {
    card = cardRect;
    const { go } = await renderShell('/');
    walkerLeft = over('Home');

    await go('/about');
    walkerLeft = over('About');
    endWalk();

    expect(pose()).toBe('pointing');
    expect(facing()).toBe(expected);
  });

  it('ignores transitionend from child elements and from other properties', async () => {
    const { go } = await renderShell('/');
    walkerLeft = over('Home');
    await go('/about');
    walkerLeft = over('About');

    endWalk('transform', walker().querySelector('svg')!);
    endWalk('opacity');

    expect(pose()).toBe('walking');
  });

  it('does not move on the not-found page', async () => {
    const { go } = await renderShell('/about');
    const before = position();

    await go('/nope');

    expect(pose()).toBe('idle');
    expect(position()).toBe(before);
  });

  it('does not walk when navigating between sub-paths of the same section', async () => {
    const { load } = createFakeSectionApp();
    const sections = eagerSections.map((section) =>
      section.id === 'projects'
        ? { ...section, mount: { kind: 'remote' as const, entry: '/apps/projects.js', load } }
        : section,
    );
    const { go } = await renderShell('/', sections);
    walkerLeft = over('Home');
    await go('/projects/a');
    walkerLeft = over('Projects');
    endWalk();
    advance(POINT_MS);
    expect(pose()).toBe('idle');

    await go('/projects/b');

    expect(pose()).toBe('idle');
    expect(position()).toBe(at('Projects'));
  });

  it('snaps (without walking) to the moved link when the language changes', async () => {
    const { go } = await renderShell('/about');
    expect(position()).toBe(at('About'));

    await go('/pt-br/about');

    expect(pose()).toBe('idle');
    expect(position()).toBe(at('Sobre'));
    expect(walker().style.transitionDuration).toBe('0ms');
  });

  it('keeps nav links clickable', async () => {
    const { user } = renderRoute('/', { sections: eagerSections });
    await screen.findByRole('heading', { level: 1, name: 'Home' }, ROUTE_WAIT);
    const nav = screen.getByRole('navigation', { name: 'Main' });

    await user.click(within(nav).getByRole('button', { name: 'Menu' }));
    await user.click(within(nav).getByRole('link', { name: 'About' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'About' }, ROUTE_WAIT),
    ).toBeInTheDocument();
  });
});

describe('HeaderMascot: rapid navigation and timers', () => {
  it('heads for the latest item; stale transitionend and fallback timers change nothing', async () => {
    const { go } = await renderShell('/');
    walkerLeft = over('Home');

    await go('/about'); // A: short walk (fallback due at 400ms)
    walkerLeft = 650; // mid-walk
    await go('/projects'); // B: short walk (fallback due at 400ms)
    walkerLeft = 700; // mid-walk
    await go('/contact'); // C: the longest walk, from where the mascot is now

    const cWalkMs = walkDuration(700, over('Contact'));
    expect(cWalkMs).toBeGreaterThan(walkDuration(over('Home'), over('About')));
    expect(pose()).toBe('walking');
    expect(position()).toBe(at('Contact'));
    expect(vi.getTimerCount()).toBe(HEADER_ONLY);

    // A transitionend from an abandoned walk (the mascot is not at C's target): ignored.
    walkerLeft = over('About');
    endWalk();
    expect(pose()).toBe('walking');

    // A's and B's fallback deadlines pass; their timers were cleared, so nothing changes.
    advance(450);
    expect(cWalkMs + ARRIVAL_FALLBACK_MARGIN_MS).toBeGreaterThan(450);
    expect(pose()).toBe('walking');

    walkerLeft = over('Contact');
    endWalk();
    expect(pose()).toBe('pointing');
    expect(vi.getTimerCount()).toBe(HEADER_ONLY);
  });

  it('turns around mid-walk, facing the latest item from where it currently is', async () => {
    const { go } = await renderShell('/');
    walkerLeft = over('Home');

    await go('/contact'); // walking right
    expect(facing()).toBe('right');
    walkerLeft = 950; // already past Architecture
    await go('/architecture');

    expect(pose()).toBe('walking');
    expect(facing()).toBe('left');
    expect(position()).toBe(at('Architecture'));
  });

  it('cancels the rest timer when a new section starts while pointing', async () => {
    const { go } = await renderShell('/');
    walkerLeft = over('Home');
    await go('/about');
    walkerLeft = over('About');
    endWalk();
    advance(POINT_MS - 500);

    await go('/projects');
    advance(600); // the old rest deadline passes

    expect(pose()).not.toBe('idle');
  });

  it('leaves no timers behind after unmount', async () => {
    const { go, unmount } = await renderShell('/');
    walkerLeft = over('Home');
    await go('/about');
    expect(vi.getTimerCount()).toBe(HEADER_ONLY);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('HeaderMascot: reduced motion', () => {
  function recordPoses() {
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(pose() ?? ''));
    observer.observe(walker(), { attributes: true, attributeFilter: ['data-pose'] });
    return { seen, stop: () => observer.disconnect() };
  }

  it('teleports and points without ever walking', async () => {
    setMedia({ reducedMotion: true });
    const { go } = await renderShell('/');
    const poses = recordPoses();

    await go('/about');
    await act(async () => {}); // flush MutationObserver records
    poses.stop();

    expect(pose()).toBe('pointing');
    expect(position()).toBe(at('About'));
    expect(walker().style.transitionDuration).toBe('0ms');
    expect(poses.seen).not.toContain('walking');
  });

  it('handles rapid navigation by jumping to the latest item, with one timer at most', async () => {
    setMedia({ reducedMotion: true });
    const { go } = await renderShell('/');
    const poses = recordPoses();

    await go('/projects');
    await go('/contact');
    await go('/about');
    await act(async () => {});
    poses.stop();

    expect(pose()).toBe('pointing');
    expect(position()).toBe(at('About'));
    expect(poses.seen).not.toContain('walking');
    expect(vi.getTimerCount()).toBe(HEADER_ONLY);
  });
});
