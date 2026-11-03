import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { TARGET_SIZE } from '../../apps/shell/src/mascot/three/anchors.ts';
import type { PixelBox } from '../../apps/shell/src/mascot/three/engine.ts';
import { JUMP_DELAY_MS } from '../../apps/shell/src/mascot/three/jumpTimer.ts';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { clickLanguage, clickNav, horizontalOverflow, mainNav, open } from '../support/shell.ts';
import { languageOf, LOCALES, pageOf } from '../support/site.ts';

declare global {
  interface Window {
    __path?: { x: number; y: number; phase: string; goal: string }[];
    __violations?: string[];
  }
}

// Never early, anywhere. How late is up to the machine: CI's are slower.
const LATE_ALLOWED_MS = process.env['CI'] ? 3000 : 1000;

const PAGES = ['home', 'about', 'projects', 'architecture', 'contact'];
const canvas = (page: Page) => page.locator('[data-mascot3d="overlay"] canvas');

const phase = (page: Page) => page.evaluate(() => window.__mascot3d!.state().phase);
const pixelBox = (page: Page) =>
  page.evaluate(() => window.__mascot3d!.pixelBox()) as Promise<PixelBox>;
const untilPhase = (page: Page, wanted: string, timeout = 20_000) =>
  expect.poll(() => phase(page), { timeout, intervals: [20] }).toBe(wanted);

async function openActive(page: Page, path: string) {
  await open(page, path);
  await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
}

/** With the timer held: jumps only when told to, so timing can't depend on the machine. */
async function openHeld(page: Page, path: string) {
  await openActive(page, path);
  await page.evaluate(() => window.__mascot3d!.holdTimer());
}

async function jumpToPerch(page: Page) {
  await page.evaluate(() => window.__mascot3d!.jumpNow());
  await untilPhase(page, 'perched');
}

const offsetFromActiveLink = (page: Page) =>
  page.evaluate(() => {
    const link = document
      .querySelector('[data-nav="main"] a[aria-current="page"]')!
      .getBoundingClientRect();
    return Math.abs(window.__mascot3d!.motion().x - (link.left + link.width / 2 + scrollX));
  });

/** Records his real position on the page, every frame. */
async function startPath(page: Page) {
  await page.evaluate(() => {
    const element = document.querySelector('[data-mascot3d="overlay"] canvas')!;
    window.__path = [];
    const tick = () => {
      const box = element.getBoundingClientRect();
      const state = window.__mascot3d?.state();
      window.__path!.push({
        x: box.left + scrollX,
        y: box.top + scrollY,
        phase: state?.phase ?? 'gone',
        goal: state?.goal ?? 'gone',
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Between frames at the engine's longest step, at its fastest flight. Beyond this is a teleport. */
const TELEPORT = 110;

async function expectNoTeleport(page: Page) {
  const path = await page.evaluate(() => window.__path!);
  expect(path.length).toBeGreaterThan(5);
  for (let i = 1; i < path.length; i += 1) {
    const distance = Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
    expect(distance, `frame ${i}, ${path[i]!.phase}`).toBeLessThanOrEqual(TELEPORT);
  }
}

const intersects = (a: PixelBox, b: PixelBox) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const cardTop = (page: Page) =>
  page.locator('[data-fun-fact]').evaluate((card) => card.getBoundingClientRect().top + scrollY);

test.describe('the real delay', () => {
  test(`jumps ${JUMP_DELAY_MS / 1000} s after settling, not before, and only once`, async ({
    page,
  }) => {
    test.setTimeout(40_000);
    await openActive(page, pageOf('about', 'en').path);
    // In the browser, with the app's own record of when the delay started: a stopwatch here would
    // start late, whenever Playwright noticed.
    const waited = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const watch = () => {
            const mascot = window.__mascot3d!;
            if (mascot.state().phase === 'seated') requestAnimationFrame(watch);
            else resolve(Date.now() - mascot.delayStartedAt()!);
          };
          requestAnimationFrame(watch);
        }),
    );
    expect(waited).toBeGreaterThanOrEqual(JUMP_DELAY_MS);
    expect(waited).toBeLessThan(JUMP_DELAY_MS + LATE_ALLOWED_MS);
    await untilPhase(page, 'perched');
    await expect(canvas(page)).toHaveCount(1);
    await page.waitForTimeout(JUMP_DELAY_MS + 2000);
    expect(await phase(page)).toBe('perched');
    expect(await page.evaluate(() => window.__mascot3d!.timerRunning())).toBe(false);
  });

  test('navigating resets it, and it never runs during an animation', async ({ page }) => {
    test.setTimeout(40_000);
    await openActive(page, pageOf('home', 'en').path);
    await page.waitForTimeout(JUMP_DELAY_MS - 2000);
    await clickNav(page, pageOf('about', 'en').label);
    await expect.poll(() => phase(page)).not.toBe('seated');
    // The trip: no timer until fully settled
    for (;;) {
      const now = await page.evaluate(() => ({
        phase: window.__mascot3d!.state().phase,
        running: window.__mascot3d!.timerRunning(),
      }));
      if (now.phase === 'seated') break;
      expect(now.running).toBe(false);
      await page.waitForTimeout(20);
    }
    const settled = Date.now();
    await expect.poll(() => page.evaluate(() => window.__mascot3d!.timerRunning())).toBe(true);
    await page.waitForTimeout(JUMP_DELAY_MS - 2000);
    expect(await phase(page)).toBe('seated');
    await untilPhase(page, 'standing', 8_000);
    expect(Date.now() - settled).toBeGreaterThan(JUMP_DELAY_MS - 1000);
    expect(Date.now() - settled).toBeLessThan(JUMP_DELAY_MS + LATE_ALLOWED_MS);
  });

  test('rapid navigation leaves one timer: one jump, to the current page', async ({ page }) => {
    test.setTimeout(40_000);
    await openActive(page, pageOf('home', 'en').path);
    for (const id of ['about', 'projects', 'contact', 'architecture']) {
      await clickNav(page, pageOf(id, 'en').label);
    }
    await untilPhase(page, 'perched', 25_000);
    await expect(canvas(page)).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText(pageOf('architecture', 'en').heading);
    const box = await pixelBox(page);
    expect(Math.abs(box.bottom - (await cardTop(page)))).toBeLessThanOrEqual(3);
    await page.waitForTimeout(JUMP_DELAY_MS + 1000);
    expect(await phase(page)).toBe('perched');
  });
});

test.describe('where he lands', () => {
  for (const locale of LOCALES) {
    for (const width of [800, 1024, 1280, 1920]) {
      for (const id of PAGES) {
        test(`${id}, ${width} px (${locale}): on the card, touching nothing`, async ({
          page,
        }, info) => {
          await page.setViewportSize({ width, height: 800 });
          await openHeld(page, pageOf(id, locale).path);
          const landing = await page.evaluate(() => window.__mascot3d!.landing());
          if (!landing) {
            // Allowed: he stays on the nav. Recorded, and reported.
            info.annotations.push({ type: 'no-landing', description: `${id} ${width} ${locale}` });
            await page.evaluate(() => window.__mascot3d!.jumpNow());
            await page.waitForTimeout(400);
            expect(await phase(page)).toBe('seated');
            return;
          }
          await page.evaluate(() => window.__mascot3d!.jumpNow());
          // While pointing, when his arm reaches furthest
          await expect
            .poll(() => page.evaluate(() => window.__mascot3d!.motion().point), {
              timeout: 20_000,
              intervals: [20],
            })
            .toBe(1);
          const box = await pixelBox(page);
          const geometry = await page.evaluate(() => {
            const rect = (element: Element) => {
              const r = element.getBoundingClientRect();
              return {
                left: r.left + scrollX,
                right: r.right + scrollX,
                top: r.top + scrollY,
                bottom: r.bottom + scrollY,
              };
            };
            const textRect = (element: Element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              const r = range.getBoundingClientRect();
              return {
                left: r.left + scrollX,
                right: r.right + scrollX,
                top: r.top + scrollY,
                bottom: r.bottom + scrollY + 5,
              };
            };
            const visible = (element: Element) => element.getBoundingClientRect().width > 0;
            return {
              card: rect(document.querySelector('[data-fun-fact]')!),
              mascots: [
                ...document.querySelectorAll('[data-slot="peek"], [data-slot="presenter"]'),
              ].map(rect),
              controls: [
                ...[...document.querySelectorAll('header a')].filter(visible).map(textRect),
                ...[...document.querySelectorAll('header button')].filter(visible).map(rect),
              ],
              text: [...document.querySelectorAll('main h1, main p, main a, main button')]
                .filter(visible)
                .map(rect),
            };
          });
          expect(box.top).toBeGreaterThanOrEqual(0);
          expect(Math.abs(box.bottom - geometry.card.top)).toBeLessThanOrEqual(3);
          expect(box.left).toBeGreaterThanOrEqual(geometry.card.left - 1);
          expect(box.right).toBeLessThanOrEqual(geometry.card.right + 1);
          for (const other of geometry.mascots) expect(intersects(box, other)).toBe(false);
          for (const other of geometry.controls) expect(intersects(box, other)).toBe(false);
          for (const other of geometry.text) expect(intersects(box, other)).toBe(false);
          expect(await horizontalOverflow(page)).toBe(0);
          // Home's illustration is really there beside him; a hidden peeking mascot keeps its space.
          for (const element of await page.locator('[data-slot="presenter"]').all()) {
            await expect(element).toBeVisible();
          }
          for (const element of await page.locator('[data-slot="peek"]').all()) {
            await expect(element).toHaveCSS('visibility', 'hidden');
            expect((await element.boundingBox())!.height).toBeGreaterThan(0);
          }
        });
      }
    }
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    for (const id of ['home', 'about']) {
      test(`${id}, ${colorScheme} theme: lands and stays visible`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await openHeld(page, pageOf(id, 'en').path);
        await jumpToPerch(page);
        const box = await pixelBox(page);
        expect(Math.abs(box.bottom - (await cardTop(page)))).toBeLessThanOrEqual(3);
        expect(box.bottom - box.top).toBeGreaterThan(TARGET_SIZE * 0.8);
      });
    }
  }

  test('a short window does not cut him off', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 320 });
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    const box = await pixelBox(page);
    expect(Math.abs(box.bottom - (await cardTop(page)))).toBeLessThanOrEqual(3);
    const visible = await canvas(page).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      return rect.top < innerHeight && x > 0 && getComputedStyle(element).visibility === 'visible';
    });
    expect(visible).toBe(true);
  });
});

test.describe('the flight', () => {
  test('keeps his head on the page, and never teleports', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await startPath(page);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    const seen = new Set<string>();
    for (let i = 0; i < 800; i += 1) {
      const sample = await page.evaluate(() => ({
        phase: window.__mascot3d!.state().phase,
        box: window.__mascot3d!.pixelBox()!,
      }));
      seen.add(sample.phase);
      expect(sample.box.top).toBeGreaterThanOrEqual(0);
      if (sample.phase === 'pointing') break;
      await page.waitForTimeout(10);
    }
    expect(seen).toEqual(new Set(['standing', 'jumping', 'pointing']));
    await expectNoTeleport(page);
  });
});

test.describe('the way back', () => {
  test('jumps back, moves to the new link, sits, and may jump again on the new page', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await openActive(page, pageOf('about', 'en').path);
    await untilPhase(page, 'perched', 15_000);
    const canvasNode = await canvas(page).elementHandle();
    await startPath(page);
    await clickNav(page, pageOf('contact', 'en').label);
    await untilPhase(page, 'seated');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    const phases = (await page.evaluate(() => window.__path!.map((p) => p.phase))).filter(
      (value, i, all) => value !== all[i - 1],
    );
    expect(phases).toEqual(['perched', 'jumping', 'walking', 'sitting', 'seated']);
    await expectNoTeleport(page);
    expect(await canvasNode.evaluate((node) => node.isConnected)).toBe(true);
    await expect(canvas(page)).toHaveCount(1);
    await untilPhase(page, 'perched', 15_000);
    expect(Math.abs((await pixelBox(page)).bottom - (await cardTop(page)))).toBeLessThanOrEqual(3);
  });

  test('from the card, head stays on the page and it returns above the label', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await clickNav(page, pageOf('home', 'en').label);
    for (let i = 0; i < 800; i += 1) {
      const sample = await page.evaluate(() => ({
        phase: window.__mascot3d!.state().phase,
        box: window.__mascot3d!.pixelBox()!,
      }));
      expect(sample.box.top).toBeGreaterThanOrEqual(0);
      if (sample.phase === 'seated') break;
      await page.waitForTimeout(10);
    }
    const anchor = await page.evaluate(() => window.__mascot3d!.anchor()!);
    expect((await pixelBox(page)).bottom).toBeLessThanOrEqual(anchor.restLine + 1);
  });
});

test.describe('interruptions', () => {
  const wanted = pageOf('projects', 'en');

  async function expectBackOnLink(page: Page) {
    await untilPhase(page, 'seated');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    await expectNoTeleport(page);
    await expect(canvas(page)).toHaveCount(1);
    expect(await page.evaluate(() => window.__mascot3d!.state().goal)).toBe('nav');
    expect(await page.evaluate(() => window.__mascot3d!.state().landing)).toBeNull();
  }

  test('navigating while standing up cancels the jump', async ({ page }) => {
    // The target page's code is loaded first, and the click comes in the same tick as the jump's
    // start: otherwise, on a slow machine, the route commits after he has already left the ground.
    await openHeld(page, wanted.path);
    await clickNav(page, pageOf('about', 'en').label);
    await untilPhase(page, 'seated');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    await untilPhase(page, 'seated');
    await startPath(page);
    await page.evaluate((path) => {
      window.__mascot3d!.jumpNow();
      document.querySelector<HTMLAnchorElement>(`[data-nav="main"] a[href="${path}"]`)!.click();
    }, wanted.path);
    await expect(page.locator('main h1')).toHaveText(wanted.heading);
    await expectBackOnLink(page);
    const phases = await page.evaluate(() => window.__path!.map((p) => p.phase));
    expect(phases).not.toContain('jumping');
  });

  test('navigating before takeoff returns on the nav', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await startPath(page);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilPhase(page, 'jumping');
    await clickNav(page, wanted.label);
    await expectBackOnLink(page);
  });

  test('navigating in mid-air bends the flight', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await startPath(page);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const flight = window.__mascot3d!.motion().flight;
            return flight !== null && flight.wait === 0 && flight.time > 0;
          }),
        { timeout: 20_000, intervals: [10] },
      )
      .toBe(true);
    await clickNav(page, wanted.label);
    await expectBackOnLink(page);
  });

  test('navigating while pointing jumps back', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await startPath(page);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await untilPhase(page, 'pointing');
    await clickNav(page, wanted.label);
    await expectBackOnLink(page);
  });

  test('navigating twice on the way back ends at the last link', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await startPath(page);
    await clickNav(page, pageOf('home', 'en').label);
    await untilPhase(page, 'jumping');
    await clickNav(page, pageOf('contact', 'en').label);
    await expectBackOnLink(page);
    await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'en').heading);
  });

  test('rapid navigation from the card leaves no stale destination', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await startPath(page);
    for (const id of ['home', 'projects', 'contact', 'architecture']) {
      await clickNav(page, pageOf(id, 'en').label);
    }
    await expectBackOnLink(page);
    await expect(page.locator('main h1')).toHaveText(pageOf('architecture', 'en').heading);
  });
});

test.describe('layout changes on the card', () => {
  test('a resize moves him with the card', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await page.setViewportSize({ width: 1000, height: 800 });
    await expect
      .poll(async () => Math.abs((await pixelBox(page)).bottom - (await cardTop(page))))
      .toBeLessThanOrEqual(3);
    expect(await phase(page)).toBe('perched');
  });

  test('a language switch keeps him on the card, with no jump', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await startPath(page);
    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'pt-BR').heading);
    await expect
      .poll(async () => Math.abs((await pixelBox(page)).bottom - (await cardTop(page))))
      .toBeLessThanOrEqual(3);
    const phases = await page.evaluate(() => window.__path!.map((p) => p.phase));
    expect(new Set(phases)).toEqual(new Set(['perched']));
  });

  test('a not-found page leaves him where he is', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await page.evaluate(() => {
      history.pushState({}, '', '/no-such-page');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForTimeout(400);
    expect(await phase(page)).toBe('perched');
  });
});

test.describe('what holds the jump back', () => {
  test('a card scrolled out of view: waits, then jumps once it is visible', async ({ page }) => {
    test.setTimeout(40_000);
    await page.setViewportSize({ width: 1280, height: 400 });
    await openActive(page, pageOf('projects', 'en').path);
    await page.evaluate(() => scrollTo(0, 1200));
    await page.waitForTimeout(JUMP_DELAY_MS + 1500);
    expect(await phase(page)).toBe('seated');
    await page.evaluate(() => scrollTo(0, 0));
    await untilPhase(page, 'perched');
  });

  test('keyboard focus on a nav link: waits, then jumps once focus leaves', async ({ page }) => {
    test.setTimeout(40_000);
    await openActive(page, pageOf('about', 'en').path);
    await page.keyboard.press('Tab');
    const link = mainNav(page).locator('a[aria-current="page"]');
    await link.focus();
    await page.waitForTimeout(JUMP_DELAY_MS + 1500);
    expect(await phase(page)).toBe('seated');
    await page.locator('main').evaluate((main) => (main as HTMLElement).focus());
    await untilPhase(page, 'perched');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('never jumps', async ({ page }) => {
    test.setTimeout(30_000);
    await openActive(page, pageOf('about', 'en').path);
    await page.waitForTimeout(JUMP_DELAY_MS + 2000);
    expect(await phase(page)).toBe('seated');
    expect(await page.evaluate(() => window.__mascot3d!.timerRunning())).toBe(false);
  });

  test('turning it on while on the card places him on the nav at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await untilPhase(page, 'seated');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    const anchor = await page.evaluate(() => window.__mascot3d!.anchor()!);
    expect((await pixelBox(page)).bottom).toBeLessThanOrEqual(anchor.restLine + 1);
  });
});

test.describe('on the card', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`axe finds nothing, ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await openHeld(page, pageOf('about', 'en').path);
      await jumpToPerch(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('blocks nothing on the card, and the keyboard still reaches everything', async ({
    page,
  }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    const box = await pixelBox(page);
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-mascot3d="overlay"]') ?? null,
      { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 },
    );
    expect(hit).toBeNull();
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () => document.activeElement?.closest('[data-mascot3d="overlay"]') !== null,
      );
      expect(inside).toBe(false);
    }
  });

  test('causes no layout shift, and stops rendering after the idle', async ({ page }) => {
    test.setTimeout(30_000);
    await page.addInitScript(() => {
      (window as unknown as { __shifts: number }).__shifts = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          sources: { node: Element | null }[];
        }[]) {
          for (const source of entry.sources ?? []) {
            if (source.node?.closest?.('[data-mascot3d="overlay"]')) {
              (window as unknown as { __shifts: number }).__shifts += 1;
            }
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await page.waitForTimeout(4500);
    const frames = await page.evaluate(() => window.__mascot3d!.frames());
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.__mascot3d!.frames())).toBe(frames);
    expect(await page.evaluate(() => (window as unknown as { __shifts: number }).__shifts)).toBe(0);
  });

  test('losing WebGL there brings the 2D mascot back on the nav', async ({ page }) => {
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await canvas(page).evaluate((element) => {
      (element as HTMLCanvasElement)
        .getContext('webgl2')!
        .getExtension('WEBGL_lose_context')!
        .loseContext();
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(canvas(page)).toHaveCount(0);
    await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'visible');
  });

  test('runs under the real CSP with no violations', async ({ page }) => {
    await page.addInitScript(() => {
      window.__violations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        window.__violations!.push(`${event.effectiveDirective}: ${event.blockedURI}`);
      });
    });
    await openHeld(page, pageOf('about', 'en').path);
    await jumpToPerch(page);
    await clickNav(page, pageOf('projects', 'en').label);
    await untilPhase(page, 'jumping');
    await untilPhase(page, 'seated');
    expect(await page.evaluate(() => window.__violations)).toEqual([]);
  });
});
