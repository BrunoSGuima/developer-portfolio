import { expect, type Page, test } from '@playwright/test';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { clickNav, open } from '../support/shell.ts';
import { LOCALES, type Locale, pageOf } from '../support/site.ts';

declare global {
  interface Window {
    __gait?: { phase: string; gait: number; run: number; x: number }[];
  }
}

const MENU = ['home', 'about', 'projects', 'architecture', 'contact'];

async function openHeld(page: Page, path: string) {
  await open(page, path);
  await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
}

const offsetFromActiveLink = (page: Page) =>
  page.evaluate(() => {
    const link = document
      .querySelector('[data-nav="main"] a[aria-current="page"]')!
      .getBoundingClientRect();
    return Math.abs(window.__mascot3d!.motion().x - (link.left + link.width / 2));
  });

/** Records the gait on every frame from now on. */
async function startRecording(page: Page) {
  await page.evaluate(() => {
    window.__gait = [];
    const tick = () => {
      const mascot = window.__mascot3d!;
      const { gait, run, x } = mascot.motion();
      window.__gait!.push({ phase: mascot.state().phase, gait, run, x });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Waits for the trip to finish and returns its moving frames. */
async function movingFrames(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__gait!.some((frame) => frame.phase === 'sitting')), {
      timeout: 30_000,
    })
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__mascot3d!.state().phase), { timeout: 30_000 })
    .toBe('seated');
  await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  // Including the sit's fade-out, which must not flip the gait either.
  return (await page.evaluate(() => window.__gait!)).filter(
    (frame) => (frame.phase === 'walking' || frame.phase === 'sitting') && frame.gait > 0,
  );
}

function expectGait(frames: { run: number }[], run: 0 | 1) {
  expect(frames.length).toBeGreaterThan(0);
  expect(new Set(frames.map((frame) => frame.run))).toEqual(new Set([run]));
}

const trips = (locale: Locale) =>
  MENU.flatMap((from, i) =>
    MENU.flatMap((to, j) => (i === j ? [] : [{ from, to, between: Math.abs(i - j) - 1, locale }])),
  );

test.describe('walk or run is decided by the menu', () => {
  // Every pair of items, in both directions, including everything involving Architecture
  for (const { from, to, between, locale } of trips('en')) {
    const gait = between === 0 ? 'walks' : 'runs';
    test(`${from} → ${to} ${gait} the whole way`, async ({ page }) => {
      await openHeld(page, pageOf(from, locale).path);
      await startRecording(page);
      await clickNav(page, pageOf(to, locale).label);
      expectGait(await movingFrames(page), between === 0 ? 0 : 1);
    });
  }

  for (const locale of LOCALES) {
    for (const width of [800, 1920]) {
      for (const [from, to, run] of [
        ['projects', 'architecture', 0],
        ['architecture', 'contact', 0],
        ['architecture', 'projects', 0],
        ['contact', 'architecture', 0],
        ['architecture', 'about', 1],
        ['home', 'architecture', 1],
      ] as const) {
        test(`${from} → ${to} at ${width} px (${locale}) ${run ? 'runs' : 'walks'} the whole way`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: 800 });
          await openHeld(page, pageOf(from, locale).path);
          await startRecording(page);
          await clickNav(page, pageOf(to, locale).label);
          expectGait(await movingFrames(page), run);
        });
      }
    }
  }

  test('consecutive trips start in their own gait, not the last one’s', async ({ page }) => {
    await openHeld(page, pageOf('home', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.motion().run), { timeout: 30_000 })
      .toBe(1);
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.state().phase), { timeout: 30_000 })
      .toBe('seated');
    await startRecording(page);
    await clickNav(page, pageOf('architecture', 'en').label);
    expectGait(await movingFrames(page), 0);
  });
});

test.describe('from the Fun Fact card', () => {
  async function fromCard(page: Page, to: string) {
    // About lands past the last item at this width, so it counts from Contact
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.state().phase), { timeout: 20_000 })
      .toBe('perched');
    const landing = await page.evaluate(() => window.__mascot3d!.state().landing!.x);
    const { spanRight } = await page.evaluate(() => window.__mascot3d!.anchor()!);
    expect(landing).toBeGreaterThan(spanRight);
    await startRecording(page);
    await clickNav(page, pageOf(to, 'en').label);
    return movingFrames(page);
  }

  test('next door to where it lands, it walks the whole way', async ({ page }) => {
    expectGait(await fromCard(page, 'architecture'), 0);
  });

  test('further from where it lands, it runs the whole way', async ({ page }) => {
    expectGait(await fromCard(page, 'home'), 1);
  });
});

test.describe('navigating during a trip', () => {
  /** The frames after the click: the gait may change once, smoothly, and never back. */
  function expectOneSmoothChange(frames: { run: number }[]) {
    for (let i = 1; i < frames.length; i += 1) {
      const step = frames[i]!.run - frames[i - 1]!.run;
      // The longest frame the engine accepts, at its blend rate
      expect(Math.abs(step)).toBeLessThanOrEqual(1 / 15 / 0.2 + 1e-6);
    }
    const direction = frames.map((frame, i) => (i ? frame.run - frames[i - 1]!.run : 0));
    expect(direction.some((step) => step > 0) && direction.some((step) => step < 0)).toBe(false);
  }

  test('a walk that gets a far destination blends into a run, and stays there', async ({
    page,
  }) => {
    await openHeld(page, pageOf('projects', 'en').path);
    await startRecording(page);
    await clickNav(page, pageOf('architecture', 'en').label);
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.state().phase), { timeout: 15_000 })
      .toBe('walking');
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.motion().gait), { timeout: 15_000 })
      .toBeGreaterThan(0.5);
    await clickNav(page, pageOf('home', 'en').label);
    const frames = await movingFrames(page);
    expectOneSmoothChange(frames);
    expect(frames.at(0)!.run).toBe(0);
    expect(frames.at(-1)!.run).toBe(1);
  });

  test('a run that gets a next-door destination blends into a walk, and stays there', async ({
    page,
  }) => {
    await openHeld(page, pageOf('home', 'en').path);
    await startRecording(page);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const { x, run } = window.__mascot3d!.motion();
            const items = window.__mascot3d!.anchor()!.items;
            return run === 1 && x > items[1]! + 10 && x < items[2]!;
          }),
        { timeout: 15_000, intervals: [10] },
      )
      .toBe(true);
    // Nearest item is now About or Projects, and About is at most next door
    await clickNav(page, pageOf('about', 'en').label);
    const frames = await movingFrames(page);
    expectOneSmoothChange(frames);
    expect(frames.at(-1)!.run).toBe(0);
  });
});

test('Architecture’s wide label changes nothing: the longest next-door hop still walks', async ({
  page,
}) => {
  await openHeld(page, pageOf('projects', 'en').path);
  const { items } = await page.evaluate(() => window.__mascot3d!.anchor()!);
  const gaps = items.slice(1).map((item, i) => item - items[i]!);
  // Architecture's two hops are the longest in the menu: distance would have made them run
  expect(Math.max(...gaps)).toBeGreaterThan(1.6 * 48);
  await startRecording(page);
  await clickNav(page, pageOf('architecture', 'en').label);
  expectGait(await movingFrames(page), 0);
});
