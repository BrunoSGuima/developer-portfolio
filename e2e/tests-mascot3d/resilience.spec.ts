import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { expect, type Page, test } from '@playwright/test';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { clickNav, horizontalOverflow, mainNav, open } from '../support/shell.ts';
import { languageOf, pageOf } from '../support/site.ts';

const canvas = (page: Page) => page.locator('[data-mascot3d="overlay"] canvas');
const html = (page: Page) => page.locator('html');
const headerMascot = (page: Page) => page.locator('[data-mascot="header"]');
const phase = (page: Page) => page.evaluate(() => window.__mascot3d!.state().phase);
const untilPhase = (page: Page, wanted: string, timeout = 30_000) =>
  expect.poll(() => phase(page), { timeout, intervals: [20] }).toBe(wanted);

async function openHeld(page: Page, path: string) {
  await open(page, path);
  await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
}

async function jumpToPerch(page: Page) {
  await page.evaluate(() => window.__mascot3d!.jumpNow());
  await untilPhase(page, 'perched');
}

const untilInTheAir = (page: Page) =>
  expect
    .poll(
      () =>
        page.evaluate(() => {
          const flight = window.__mascot3d!.motion().flight;
          return flight !== null && flight.wait === 0 && flight.time > 0;
        }),
      { timeout: 20_000, intervals: [10] },
    )
    .toBe(true);

const offsetFromActiveLink = (page: Page) =>
  page.evaluate(() => {
    const link = document
      .querySelector('[data-nav="main"] a[aria-current="page"]')!
      .getBoundingClientRect();
    return Math.abs(window.__mascot3d!.motion().x - (link.left + link.width / 2 + scrollX));
  });

const offset2dFromActiveLink = (page: Page) =>
  page.evaluate(() => {
    const walker = document.querySelector('[data-mascot="header"] > div')!.getBoundingClientRect();
    const link = document
      .querySelector('[data-nav="main"] a[aria-current="page"]')!
      .getBoundingClientRect();
    return Math.abs(walker.left + walker.width / 2 - (link.left + link.width / 2));
  });

/** What every failure must leave: no 3D, the 2D mascot back on the active link, the reason recorded. */
async function expect2dRestored(page: Page, reason: string) {
  await expect(html(page)).not.toHaveAttribute('data-mascot3d', 'active');
  await expect(html(page)).toHaveAttribute('data-mascot3d-fallback', reason);
  await expect(canvas(page)).toHaveCount(0);
  await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
  expect(await horizontalOverflow(page)).toBe(0);
  // No retry within the visit, and the site keeps working. Measured after moving: the 2D mascot can
  // start off-centre on a page's first load, with or without the 3D one (M4-REPORT.md).
  await clickNav(page, pageOf('contact', 'en').label);
  await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'en').heading);
  await expect.poll(() => offset2dFromActiveLink(page), { timeout: 10_000 }).toBeLessThanOrEqual(2);
  await page.waitForTimeout(500);
  await expect(canvas(page)).toHaveCount(0);
}

test.describe('every failure takes the same path back to 2D', () => {
  const pageErrors = (page: Page) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
  };

  test('an error inside a frame, seated', async ({ page }) => {
    const errors = pageErrors(page);
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.breakNextFrame());
    await expect2dRestored(page, 'frame-error');
    expect(errors).toEqual([]);
  });

  test('an error inside a frame, in mid-air', async ({ page }) => {
    const errors = pageErrors(page);
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilInTheAir(page);
    await page.evaluate(() => window.__mascot3d!.breakNextFrame());
    await expect2dRestored(page, 'frame-error');
    expect(errors).toEqual([]);
  });

  test('a lost context, on the card', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await canvas(page).evaluate((element) => {
      (element as HTMLCanvasElement)
        .getContext('webgl2')!
        .getExtension('WEBGL_lose_context')!
        .loseContext();
    });
    await expect2dRestored(page, 'context-lost');
  });

  test('sustained slowness', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.simulateFrames(120, 300));
    await expect2dRestored(page, 'slowdown');
  });

  test('a page reload after a slowdown tries 3D again: the fallback is not permanent', async ({
    page,
  }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.simulateFrames(120, 300));
    await expect(html(page)).not.toHaveAttribute('data-mascot3d', 'active');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
  });

  test('isolated slow frames do not cause it', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => {
      const mascot = window.__mascot3d!;
      for (let i = 0; i < 300; i += 1) {
        mascot.simulateFrames(16, 4);
        mascot.simulateFrames(900, 1);
      }
    });
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
  });

  test('a model its profile can’t use', async ({ page }) => {
    const errors = pageErrors(page);
    await open(page, `${pageOf('about', 'en').path}?mascot-character=broken`);
    await expect(html(page)).toHaveAttribute('data-mascot3d-fallback', 'load-failed');
    await expect(html(page)).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(canvas(page)).toHaveCount(0);
    await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
    expect(errors).toEqual([]);
  });

  test('a model that can’t be fetched', async ({ page }) => {
    const errors = pageErrors(page);
    await open(page, `${pageOf('about', 'en').path}?mascot-character=missing`);
    await expect(html(page)).toHaveAttribute('data-mascot3d-fallback', 'load-failed');
    await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
    expect(errors).toEqual([]);
  });

  test('a restored page whose context did not survive', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await canvas(page).evaluate((element) => {
      const context = (element as HTMLCanvasElement).getContext('webgl2')!;
      context.isContextLost = () => true;
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await expect2dRestored(page, 'context-lost');
  });
});

test.describe('another character, with nothing in common', () => {
  const fixture = (path: string, name = 'fixture') => `${path}?mascot-character=${name}`;

  for (const name of ['fixture', 'fixture-with-prop', 'fixture-no-prop-node']) {
    test(`${name}: the whole sequence, with no behaviour change`, async ({ page }) => {
      test.setTimeout(45_000);
      await openHeld(page, fixture(pageOf('about', 'en').path, name));
      await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
      const { size, metrics, restLine } = await page.evaluate(() => window.__mascot3d!.anchor()!);
      expect(size).toBe(48);
      expect(metrics.standingTop).toBe(1);

      // Seated on its link, on the label's line
      const seated = await page.evaluate(() => window.__mascot3d!.pixelBox()!);
      expect(seated.bottom).toBeLessThanOrEqual(restLine + 1);

      // The jump and landing
      await page.evaluate(() => window.__mascot3d!.jumpNow());
      await untilPhase(page, 'pointing');
      await untilPhase(page, 'perched');
      const top = await page
        .locator('[data-fun-fact]')
        .evaluate((card) => card.getBoundingClientRect().top + scrollY);
      const perched = await page.evaluate(() => window.__mascot3d!.pixelBox()!);
      expect(Math.abs(perched.bottom - top)).toBeLessThanOrEqual(3);

      // The return, keeping the query string out of it: the route changes, the character doesn't
      await clickNav(page, pageOf('home', 'en').label);
      await untilPhase(page, 'jumping');
      await untilPhase(page, 'seated');
      await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
      await expect(canvas(page)).toHaveCount(1);
    });
  }

  test('its optional accessory shows only when asked for, and changes no motion', async ({
    page,
  }) => {
    await openHeld(page, fixture(pageOf('about', 'en').path));
    const without = await page.evaluate(() => window.__mascot3d!.measurePose({})!);
    await openHeld(page, fixture(pageOf('about', 'en').path, 'fixture-with-prop'));
    const withProp = await page.evaluate(() => window.__mascot3d!.measurePose({})!);
    expect(withProp.right).toBeGreaterThan(without.right);
    expect(Math.abs(withProp.top - without.top)).toBeLessThan(0.03);
  });
});

test.describe('a character’s profile matches its pixels', () => {
  // Measured larger than life, so 0.03 of its height is about 3 pixels.
  const TOLERANCE = 0.03;

  for (const [label, query] of [
    ['the active character', ''],
    ['the test character', '?mascot-character=fixture'],
  ] as const) {
    test(`${label}`, async ({ page }) => {
      await openHeld(page, `${pageOf('about', 'en').path}${query}`);
      const { metrics, poses } = await page.evaluate(() => {
        const mascot = window.__mascot3d!;
        return {
          metrics: mascot.anchor()!.metrics,
          poses: {
            standing: mascot.measurePose({})!,
            walking: mascot.measurePose({ gait: 1, run: 0, cycle: 0.3 })!,
            seated: mascot.measurePose({ sit: 1 })!,
            pointingL: mascot.measurePose({ point: 1, arm: 'L' })!,
            pointingR: mascot.measurePose({ point: 1, arm: 'R' })!,
            jump: mascot.jumpReach(24),
          },
        };
      });
      expect(Math.abs(poses.standing.top - metrics.standingTop)).toBeLessThanOrEqual(TOLERANCE);
      expect(poses.walking.top).toBeLessThanOrEqual(metrics.standingTop + TOLERANCE);
      expect(Math.abs(poses.seated.top - metrics.seatedTop)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(poses.seated.bottom - metrics.seatedBottom)).toBeLessThanOrEqual(TOLERANCE);
      expect(poses.standing.right).toBeLessThanOrEqual(metrics.halfWidth + TOLERANCE);
      expect(-poses.standing.left).toBeLessThanOrEqual(metrics.halfWidth + TOLERANCE);
      // Its reach may be generous, but never short: nothing else may stand there
      expect(poses.pointingL.right).toBeLessThanOrEqual(metrics.pointReach + TOLERANCE);
      expect(-poses.pointingR.left).toBeLessThanOrEqual(metrics.pointReach + TOLERANCE);
      // Both arms must really point: the pointing side reaches further than the resting one
      expect(poses.pointingL.right).toBeGreaterThan(poses.standing.right);
      expect(-poses.pointingR.left).toBeGreaterThan(-poses.standing.left);
      expect(poses.jump).toBeLessThanOrEqual(metrics.jumpTop + TOLERANCE);
    });
  }
});

test.describe('the interruptions still to cover', () => {
  test('falling below the desktop width in mid-air: 2D, then 3D again on return', async ({
    page,
  }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilInTheAir(page);
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(html(page)).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(canvas(page)).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
    await page.evaluate(() => window.__mascot3d!.holdTimer());
    await expect(canvas(page)).toHaveCount(1);
    expect(await phase(page)).toBe('seated');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });

  test('a language switch in mid-air lands it on the moved card', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilInTheAir(page);
    await page
      .getByRole('link', { name: languageOf('pt-BR').linkName })
      .first()
      .click();
    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'pt-BR').heading);
    await untilPhase(page, 'perched');
    const top = await page
      .locator('[data-fun-fact]')
      .evaluate((card) => card.getBoundingClientRect().top + scrollY);
    const box = await page.evaluate(() => window.__mascot3d!.pixelBox()!);
    expect(Math.abs(box.bottom - top)).toBeLessThanOrEqual(3);
  });

  test('back and forward in mid-air end on the right link', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await untilPhase(page, 'walking');
    await untilPhase(page, 'seated');
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilInTheAir(page);
    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'en').heading);
    await page.goForward();
    await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'en').heading);
    await untilPhase(page, 'seated');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    await expect(canvas(page)).toHaveCount(1);
  });

  test('a hidden tab in mid-air lands it when shown again, without a sudden move', async ({
    page,
  }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilInTheAir(page);
    const hide = (hidden: boolean) =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await hide(true);
    await page.waitForTimeout(100);
    const frames = await page.evaluate(() => window.__mascot3d!.frames());
    const before = await page.evaluate(() => window.__mascot3d!.motion().x);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__mascot3d!.frames())).toBe(frames);
    await hide(false);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const after = await page.evaluate(() => window.__mascot3d!.motion().x);
    expect(Math.abs(after - before)).toBeLessThan(120);
    await untilPhase(page, 'perched');
  });
});

/** A small repeatable generator, so a failing seed can be replayed. */
function randomFrom(seed: number) {
  let value = seed;
  return (limit: number) => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return Math.floor((value / 4294967296) * limit);
  };
}

test.describe('chaos', () => {
  for (const seed of [1, 7, 42, 2026]) {
    test(`random interruptions, seed ${seed}`, async ({ page }) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openHeld(page, pageOf('about', 'en').path);
      const next = randomFrom(seed);
      const links = ['home', 'about', 'projects', 'architecture', 'contact'];
      const widths = [1024, 1280, 1500, 1920];
      let hidden = false;
      const setHidden = (value: boolean) =>
        page.evaluate((v) => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
          document.dispatchEvent(new Event('visibilitychange'));
        }, value);

      for (let step = 0; step < 30; step += 1) {
        const action = next(8);
        switch (action) {
          case 0:
          case 1:
            await page.evaluate(
              (index) =>
                document
                  .querySelectorAll<HTMLElement>('[data-nav="main"] ul > li > a')
                  [index]?.click(),
              next(links.length),
            );
            break;
          case 2:
            await page.evaluate(() => window.__mascot3d!.jumpNow());
            break;
          case 3:
            await page.setViewportSize({ width: widths[next(widths.length)]!, height: 800 });
            break;
          case 4:
            // Only within the site: going back further would leave it.
            if (await page.evaluate(() => (history.state as { idx?: number } | null)?.idx)) {
              await page.goBack();
            }
            break;
          case 5:
            await mainNav(page).getByRole('link').nth(next(links.length)).focus();
            break;
          case 6:
            hidden = !hidden;
            await setHidden(hidden);
            break;
          case 7:
            await page.locator('main').evaluate((main) => (main as HTMLElement).focus());
            break;
        }
        await page.waitForTimeout(next(250));
        await expect(canvas(page)).toHaveCount(1);
      }

      // However it was left, it settles in the right place.
      if (hidden) await setHidden(false);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.locator('main').evaluate((main) => (main as HTMLElement).focus());
      const nav = mainNav(page).getByRole('link').first();
      await nav.click();
      await expect(page.locator('main h1')).toHaveText(pageOf('home', 'en').heading);
      await page.evaluate(() => window.__mascot3d!.settle());
      expect(await phase(page), `seed ${seed}`).toBe('seated');
      await expect
        .poll(() => offsetFromActiveLink(page), { message: `seed ${seed}` })
        .toBeLessThanOrEqual(2);
      await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
      await expect(canvas(page)).toHaveCount(1);
      // Rapid navigation skips view transitions, which the site reports with or without the mascot.
      const ownErrors = errors.filter((message) => !message.startsWith('Transition was skipped'));
      expect(ownErrors, `seed ${seed}`).toEqual([]);
    });
  }
});

test.describe('resources', () => {
  test('a long session: what the renderer holds stays flat', async ({ page }) => {
    test.setTimeout(300_000);
    await openHeld(page, pageOf('about', 'en').path);
    const links = ['home', 'about', 'projects', 'architecture', 'contact'];
    await page.evaluate(() => window.__mascot3d!.settle());
    const trip = async (index: number) => {
      await page.evaluate((i) => {
        document.querySelectorAll<HTMLElement>('[data-nav="main"] ul > li > a')[i]?.click();
      }, index);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.evaluate(() => window.__mascot3d!.settle());
    };
    // Warm up, so what was compiled once isn't counted as growth.
    for (let i = 0; i < links.length; i += 1) await trip(i);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await page.evaluate(() => window.__mascot3d!.settle());
    const start = await page.evaluate(() => window.__mascot3d!.memory());
    let trips = 0;
    for (let round = 0; round < 40; round += 1) {
      for (let i = 0; i < links.length; i += 1) {
        await trip(i);
        trips += 1;
      }
      await page.evaluate(() => window.__mascot3d!.jumpNow());
      await page.evaluate(() => window.__mascot3d!.settle());
    }
    expect(trips).toBe(200);
    expect(await page.evaluate(() => window.__mascot3d!.memory())).toEqual(start);
    await expect(canvas(page)).toHaveCount(1);
  });

  test('crossing the desktop width many times leaks no WebGL contexts', async ({ page }) => {
    test.setTimeout(120_000);
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (/too many active webgl contexts/i.test(message.text())) warnings.push(message.text());
    });
    await openHeld(page, pageOf('about', 'en').path);
    const first = await page.evaluate(() => window.__mascot3d!.memory());
    // Browsers allow about 16 live contexts, and warn when the oldest is dropped.
    for (let i = 0; i < 20; i += 1) {
      await page.setViewportSize({ width: 600, height: 800 });
      await expect(canvas(page)).toHaveCount(0);
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');
      await page.evaluate(() => window.__mascot3d!.holdTimer());
      await expect(canvas(page)).toHaveCount(1);
    }
    expect(warnings).toEqual([]);
    expect(await page.evaluate(() => window.__mascot3d!.memory())).toEqual(first);
  });

  test('frame costs are recorded through the whole sequence, for the report', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilPhase(page, 'perched');
    const { samples, maxFrame } = await page.evaluate(() => window.__mascot3d!.timing());
    expect(samples).toBeGreaterThan(30);
    test.info().annotations.push({ type: 'costs', description: `slowest frame ${maxFrame}` });
    expect(await page.evaluate(() => window.__mascot3d!.report())).toMatch(/JS p50 .* p95 .* max /);
  });
});

test.describe('accessibility, beyond the usual', () => {
  test('Forced Colors: a clear focus ring, nothing blocked, axe finds nothing of the mascot’s', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openHeld(page, pageOf('about', 'en').path);
    await page.keyboard.press('Tab');
    const link = mainNav(page).locator('a[aria-current="page"]');
    await link.focus();
    await expect(link).toHaveCSS('outline-style', 'solid');
    await expect(link).toHaveCSS('outline-width', '3px');
    await expect.poll(() => page.evaluate(() => window.__mascot3d!.motion().rise)).toBe(1);
    // The site has one contrast finding in this mode, with or without the mascot (M4-REPORT.md).
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const targets = results.violations.flatMap((violation) =>
      violation.nodes.map((node) => String(node.target)),
    );
    expect(targets.filter((target) => /mascot3d|data-nav/.test(target))).toEqual([]);
  });

  test('200% zoom at 1280 px: a 640 px layout, so the 2D mascot, with no overflow', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 640, height: 400 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await open(page, pageOf('about', 'en').path);
    await page.waitForTimeout(2000);
    await expect(canvas(page)).toHaveCount(0);
    expect(requests.filter((url) => /\.glb|engine-/.test(url))).toEqual([]);
    expect(await horizontalOverflow(page)).toBe(0);
    await context.close();
  });

  test('200% zoom at 1920 px: it still fits, with no overflow or clipping', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    const box = await page.evaluate(() => window.__mascot3d!.pixelBox()!);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(await horizontalOverflow(page)).toBe(0);
    await context.close();
  });

  test('printing shows the 2D mascot and no canvas', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-mascot3d="overlay"]')).toHaveCSS('display', 'none');
    await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
    await page.emulateMedia({ media: 'screen' });
    await expect(page.locator('[data-mascot3d="overlay"]')).toHaveCSS('display', 'block');
  });
});

test.describe('page impact', () => {
  test('the engine stays within its budget and doesn’t delay the first paint', async ({ page }) => {
    await page.goto(pageOf('about', 'en').path);
    const paintedFirst = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const check = () => {
            const paint = performance.getEntriesByName('first-contentful-paint')[0];
            if (!paint) return void requestAnimationFrame(check);
            const engine = performance
              .getEntriesByType('resource')
              .find((entry) => /engine-.*\.js$/.test(entry.name));
            resolve(!engine || engine.startTime >= paint.startTime);
          };
          check();
        }),
    );
    expect(paintedFirst).toBe(true);
    await expect(html(page)).toHaveAttribute('data-mascot3d', 'active');

    const assets = fileURLToPath(
      new URL('../../apps/shell/.mascot3d-dist/assets/', import.meta.url),
    );
    const engine = readdirSync(assets).find((name) => /^engine-.*\.js$/.test(name))!;
    const gzipped = gzipSync(readFileSync(join(assets, engine))).length;
    expect(gzipped).toBeLessThanOrEqual(200 * 1024);
  });
});
