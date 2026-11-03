import { expect, type Page, test } from '@playwright/test';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { pageOf } from '../support/site.ts';

// What the visitor sees from the very first frame: an interactive 2D mascot only ever after a real
// failure, and Home's presenting illustration always.

declare global {
  interface Window {
    __startup: {
      visible2D: boolean;
      presenter: 'absent' | 'visible' | 'hidden';
      active: boolean;
      attr2D: boolean;
      t: number;
    }[];
    __shift: number;
  }
}

async function record(page: Page) {
  await page.addInitScript(() => {
    window.__startup = [];
    window.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        window.__shift += (entry as unknown as { value: number }).value;
    }).observe({ type: 'layout-shift', buffered: true });
    const tick = () => {
      const html = document.documentElement;
      const shown = [
        ...document.querySelectorAll(
          '[data-mascot="header"], [data-slot="peek"], [data-slot="fingertips"]',
        ),
      ].some((el) => getComputedStyle(el).visibility === 'visible');
      const presenter = document.querySelector('[data-slot="presenter"]');
      window.__startup.push({
        visible2D: shown,
        presenter: !presenter
          ? 'absent'
          : getComputedStyle(presenter).visibility === 'visible'
            ? 'visible'
            : 'hidden',
        active: html.dataset['mascot3d'] === 'active',
        attr2D: html.dataset['mascot2d'] !== undefined,
        t: performance.now(),
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const frames = (page: Page) => page.evaluate(() => window.__startup);
const html = (page: Page) => page.locator('html');
const about = pageOf('about', 'en').path;

async function expectNo2D(page: Page) {
  const seen = await frames(page);
  expect(seen.length).toBeGreaterThan(5);
  expect(seen.filter((frame) => frame.visible2D)).toEqual([]);
}

async function expectIllustrationThroughout(page: Page) {
  const states = (await frames(page)).filter((frame) => frame.presenter !== 'absent');
  expect(states.length).toBeGreaterThan(5);
  expect(states.filter((frame) => frame.presenter === 'hidden')).toEqual([]);
}

/** Delays a request, then lets it through. */
const slow = (page: Page, pattern: RegExp, ms: number) =>
  page.route(pattern, async (route) => {
    await new Promise((done) => setTimeout(done, ms));
    await route.continue();
  });

test.describe('with 3D working, no 2D mascot ever shows', () => {
  for (const [label, path] of [
    ['Home', '/'],
    ['a page with the peeking mascot', about],
  ] as const) {
    test(`first load, ${label}`, async ({ page }) => {
      await record(page);
      await page.goto(path);
      await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
      await page.waitForTimeout(300);
      await expectNo2D(page);
      expect(await page.evaluate(() => window.__shift)).toBeLessThan(0.01);
    });
  }

  for (const [label, pattern] of [
    ['a slow engine', /\/engine-[^/]*\.js$/],
    ['a slow model', /\/bruno-[^/]*\.glb$/],
    ['a slow texture', /\/base-[^/]*\.webp$/],
  ] as const) {
    test(`${label}, 3 s late`, async ({ page }) => {
      await record(page);
      await slow(page, pattern, 3000);
      await page.goto(about);
      await page.waitForTimeout(2000);
      await expect(html(page)).not.toHaveAttribute('data-mascot3d', 'active');
      await expect(html(page)).toHaveAttribute('data-mascot3d', 'active', { timeout: 15_000 });
      await page.waitForTimeout(300);
      await expectNo2D(page);
      expect(await page.evaluate(() => window.__shift)).toBeLessThan(0.01);
    });
  }

  test('navigating while it loads changes nothing', async ({ page }) => {
    await record(page);
    await slow(page, /\/bruno-[^/]*\.glb$/, 2000);
    await page.goto(about);
    await page.locator('[data-nav="main"] a').nth(2).click();
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active', { timeout: 15_000 });
    await expectNo2D(page);
  });
});

test.describe('Home’s presenting illustration shows from its first frame, whatever 3D does', () => {
  test('3D working', async ({ page }) => {
    await record(page);
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
    await page.waitForTimeout(300);
    await expectIllustrationThroughout(page);
    await expect(page.locator('[data-slot="presenter"]')).toBeVisible();
  });

  test('3D loading slowly', async ({ page }) => {
    await record(page);
    await slow(page, /\/bruno-[^/]*\.glb$/, 3000);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-slot="presenter"]')).toBeVisible();
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active', { timeout: 15_000 });
    await expectIllustrationThroughout(page);
    await expectNo2D(page);
  });

  test('3D failing', async ({ page }) => {
    await record(page);
    await page.route(/\/bruno-[^/]*\.glb$/, (route) => route.abort());
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
    await expectIllustrationThroughout(page);
    await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'visible');
  });
});

test.describe('genuine failures show the 2D mascots, in both places', () => {
  const expect2D = async (page: Page) => {
    await expect(html(page)).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
    await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'visible');
    await expect(page.locator('[data-slot="peek"]')).toHaveCSS('visibility', 'visible');
    await expect(html(page)).not.toHaveAttribute('data-mascot3d', 'active');
  };

  for (const [label, pattern] of [
    ['the engine', /\/engine-[^/]*\.js$/],
    ['the host chunk', /\/Mascot3DHost-[^/]*\.js$/],
    ['the model', /\/bruno-[^/]*\.glb$/],
    ['the texture', /\/base-[^/]*\.webp$/],
  ] as const) {
    test(`${label} fails to load`, async ({ page }) => {
      await record(page);
      await page.route(pattern, (route) => route.abort());
      await page.goto(about);
      await expect2D(page);
      // Never before the failure.
      const seen = await frames(page);
      const first = seen.findIndex((frame) => frame.visible2D);
      if (first >= 0) expect(seen.slice(0, first).every((frame) => !frame.active)).toBe(true);
    });
  }

  test('no WebGL', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = (() => null) as never;
    });
    await page.goto(about);
    await expect2D(page);
  });

  test('a load that never finishes: the 2D mascot takes over after its budget', async ({
    page,
  }) => {
    await record(page);
    await page.route(/\/bruno-[^/]*\.glb$/, () => undefined);
    await page.goto(about);
    await page.waitForTimeout(8000);
    await expect(html(page)).not.toHaveAttribute('data-mascot2d', '');
    await expect2D(page);
  });

  test('a load that finishes after the budget still ends on 3D alone', async ({ page }) => {
    await slow(page, /\/bruno-[^/]*\.glb$/, 11_000);
    await page.goto(about);
    await expect(html(page)).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active', { timeout: 15_000 });
    await expect(html(page)).not.toHaveAttribute('data-mascot2d', '');
    await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('[data-slot="peek"]')).toHaveCSS('visibility', 'hidden');
  });

  test('a frame error later on: 2D in both places, in the right layout', async ({ page }) => {
    await page.goto(about);
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
    await page.evaluate(() => window.__mascot3d!.breakNextFrame());
    await expect2D(page);
  });
});

test('below the desktop width the 2D mascots show from the first frame', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await record(page);
  await page.goto(about);
  await expect(page.locator('[data-slot="peek"]')).toHaveCSS('visibility', 'visible');
  await page.waitForTimeout(500);
  const seen = await frames(page);
  const rendered = seen.findIndex((frame) => frame.visible2D);
  expect(rendered).toBeGreaterThanOrEqual(0);
  expect(seen.slice(rendered).every((frame) => frame.visible2D)).toBe(true);
});
