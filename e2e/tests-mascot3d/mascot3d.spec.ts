import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import sharp from 'sharp';
import {
  NAV_RING_OUTSET,
  headSafeFeetY,
  TARGET_SIZE,
} from '../../apps/shell/src/mascot/three/anchors.ts';
import type { PixelBox } from '../../apps/shell/src/mascot/three/engine.ts';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { clickLanguage, clickNav, horizontalOverflow, mainNav, open } from '../support/shell.ts';
import { languageOf, LOCALES, pageOf, pagesIn } from '../support/site.ts';

declare global {
  interface Window {
    __violations?: string[];
    __trace?: { x: number; phase: string; frame: number }[];
    __node?: Element | null;
  }
}

const canvas = (page: Page) => page.locator('[data-mascot3d="overlay"] canvas');
const headerMascot = (page: Page) => page.locator('[data-mascot="header"]');

// The nav's own behaviour: the jump has its own spec, and slow software rendering mustn't start one here.
async function openReady(page: Page, path: string) {
  await open(page, path);
  await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
}

const phase = (page: Page) => page.evaluate(() => window.__mascot3d!.state().phase);
const pixelBox = (page: Page) =>
  page.evaluate(() => window.__mascot3d!.pixelBox()) as Promise<PixelBox>;

const waitSeated = (page: Page) =>
  expect.poll(() => phase(page), { timeout: 30_000 }).toBe('seated');

/** Horizontal distance between the character and the active link's centre. */
function offsetFromActiveLink(page: Page) {
  return page.evaluate(() => {
    const link = document
      .querySelector('[data-nav="main"] a[aria-current="page"]')!
      .getBoundingClientRect();
    return Math.abs(window.__mascot3d!.motion().x - (link.left + link.width / 2 + scrollX));
  });
}

/** Records the character's real on-screen position and phase on every frame from now on. */
async function startTrace(page: Page) {
  await page.evaluate(() => {
    const element = document.querySelector('[data-mascot3d="overlay"] canvas')!;
    window.__node = element;
    window.__trace = [];
    let frame = 0;
    const tick = () => {
      frame += 1;
      window.__trace!.push({
        x: element.getBoundingClientRect().left,
        phase: window.__mascot3d?.state().phase ?? 'gone',
        frame,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const distinct = (list: string[]) => list.filter((value, i) => value !== list[i - 1]);

test.describe('placement', () => {
  for (const locale of LOCALES) {
    for (const width of [800, 1024, 1280, 1920]) {
      test(`seated at the active link at ${width} px (${locale})`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await openReady(page, pageOf('about', locale).path);
        await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
        expect(await phase(page)).toBe('seated');
        expect(await page.evaluate(() => window.__mascot3d!.size())).toBe(TARGET_SIZE);
        const box = await pixelBox(page);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(await horizontalOverflow(page)).toBe(0);
      });
    }
  }

  test('replaces only the 2D nav mascot: the Fun Fact mascots stay', async ({ page }) => {
    await openReady(page, '/');
    await expect(headerMascot(page)).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('[data-mascot="fun-fact"]')).toBeVisible();
  });
});

test.describe('a trip along the nav', () => {
  test('stands, walks and sits, as one element, with no jump across the view transition', async ({
    page,
  }) => {
    await openReady(page, pageOf('about', 'en').path);
    await startTrace(page);
    await clickNav(page, pageOf('projects', 'en').label);
    await expect
      .poll(() => page.evaluate(() => window.__trace!.some((t) => t.phase === 'sitting')), {
        timeout: 30_000,
      })
      .toBe(true);
    await waitSeated(page);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    await expect.poll(() => page.evaluate(() => window.__trace!.at(-1)!.phase)).toBe('seated');

    const { same, trace } = await page.evaluate(() => ({
      same: window.__node === document.querySelector('[data-mascot3d="overlay"] canvas'),
      trace: window.__trace!,
    }));
    expect(same).toBe(true);
    expect(distinct(trace.map((t) => t.phase))).toEqual([
      'seated',
      'standing',
      'walking',
      'sitting',
      'seated',
    ]);
    // Limited by the fastest gait and the longest frame the engine accepts, plus a rounding pixel
    const limit = 2.4 * TARGET_SIZE * (1 / 15) + 1;
    for (let i = 1; i < trace.length; i += 1) {
      expect(Math.abs(trace[i]!.x - trace[i - 1]!.x)).toBeLessThanOrEqual(limit);
    }
  });

  test('stays above the page during the crossfade', async ({ page }) => {
    await openReady(page, pageOf('about', 'en').path);
    const name = await canvas(page).evaluate((el) => getComputedStyle(el).viewTransitionName);
    expect(name).toBe('mascot3d');
  });

  test('runs a long distance instead of walking it', async ({ page }) => {
    await openReady(page, pageOf('home', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.motion().run), { timeout: 15_000 })
      .toBeGreaterThan(0);
    await waitSeated(page);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });

  test('rapid navigation ends seated on the last item', async ({ page }) => {
    await openReady(page, pageOf('home', 'en').path);
    const links = pagesIn('en').filter((p) => p.path !== '/');
    for (const link of links) await clickNav(page, link.label);
    await clickNav(page, pageOf('home', 'en').label);
    await waitSeated(page);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });

  test('a not-found page leaves it where it is', async ({ page }) => {
    await openReady(page, pageOf('about', 'en').path);
    const before = await page.evaluate(() => window.__mascot3d!.motion().x);
    await page.evaluate(() => {
      history.pushState({}, '', '/no-such-page');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForTimeout(500);
    expect(await phase(page)).toBe('seated');
    expect(await page.evaluate(() => window.__mascot3d!.motion().x)).toBe(before);
  });
});

test.describe('layout changes', () => {
  test('a resize at rest re-anchors without a trip', async ({ page }) => {
    await openReady(page, pageOf('projects', 'en').path);
    await startTrace(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 1600, height: 800 });
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    const phases = await page.evaluate(() => window.__trace!.map((t) => t.phase));
    expect(new Set(phases)).toEqual(new Set(['seated']));
  });

  test('a resize mid-walk still arrives at the moved link', async ({ page }) => {
    await openReady(page, pageOf('home', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('walking');
    await page.setViewportSize({ width: 1500, height: 800 });
    await waitSeated(page);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });

  test('a language switch re-anchors without a trip', async ({ page }) => {
    await openReady(page, pageOf('about', 'en').path);
    await startTrace(page);
    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'pt-BR').heading);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    const phases = await page.evaluate(() => window.__trace!.map((t) => t.phase));
    expect(new Set(phases)).toEqual(new Set(['seated']));
  });

  test('dropping below the desktop width and back places it again', async ({ page }) => {
    await openReady(page, pageOf('about', 'en').path);
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(canvas(page)).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });
});

/** The top of the nav labels' real ink, from a screenshot with the character hidden. */
async function inkTopFromPixels(page: Page) {
  // Through script: the site's CSP rightly refuses an injected <style>.
  const overlay = page.locator('[data-mascot3d="overlay"]');
  await overlay.evaluate((element) => {
    (element as HTMLElement).style.visibility = 'hidden';
  });
  const boxes = await mainNav(page)
    .getByRole('link')
    .evaluateAll((links) =>
      links.map((link) => {
        const range = document.createRange();
        range.selectNodeContents(link);
        const text = range.getBoundingClientRect();
        return { x: text.left, width: text.width, top: link.getBoundingClientRect().top };
      }),
    );
  let highest = Infinity;
  for (const box of boxes) {
    const clip = {
      x: Math.floor(box.x),
      y: Math.floor(box.top),
      width: Math.ceil(box.width),
      height: 30,
    };
    const { data, info } = await sharp(await page.screenshot({ clip }))
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y += 1) {
      const row = y * info.width * info.channels;
      let found = false;
      for (let x = 0; x < info.width && !found; x += 1) {
        const at = row + x * info.channels;
        const difference =
          Math.abs(data[at]! - data[row]!) +
          Math.abs(data[at + 1]! - data[row + 1]!) +
          Math.abs(data[at + 2]! - data[row + 2]!);
        found = difference > 150;
      }
      if (found) {
        highest = Math.min(highest, clip.y + y);
        break;
      }
    }
  }
  await overlay.evaluate((element) => {
    (element as HTMLElement).style.visibility = '';
  });
  return highest;
}

const riseSettled = (page: Page, value: number) =>
  expect.poll(() => page.evaluate(() => window.__mascot3d!.motion().rise)).toBe(value);

test.describe('sitting on the active link', () => {
  for (const locale of LOCALES) {
    for (const colorScheme of ['light', 'dark'] as const) {
      for (const width of [800, 1280]) {
        test(`rests just above the label, never on it, ${width} px, ${colorScheme} (${locale})`, async ({
          page,
        }) => {
          await page.emulateMedia({ colorScheme });
          await page.setViewportSize({ width, height: 800 });
          await openReady(page, pageOf('about', locale).path);
          const box = await pixelBox(page);
          const ink = await inkTopFromPixels(page);
          expect(box.top).toBeGreaterThanOrEqual(0);
          expect(box.bottom).toBeLessThanOrEqual(ink);
          // Visually connected: the old position left 20 px
          expect(ink - box.bottom).toBeLessThanOrEqual(4);
        });

        test(`stays off the label through a whole trip, ${width} px, ${colorScheme} (${locale})`, async ({
          page,
        }) => {
          await page.emulateMedia({ colorScheme });
          await page.setViewportSize({ width, height: 800 });
          await openReady(page, pageOf('home', locale).path);
          const ink = await inkTopFromPixels(page);
          await clickNav(page, pageOf('contact', locale).label);
          const seen = new Set<string>();
          for (let i = 0; i < 600; i += 1) {
            const sample = await page.evaluate(() => ({
              phase: window.__mascot3d!.state().phase,
              box: window.__mascot3d!.pixelBox()!,
            }));
            seen.add(sample.phase);
            expect(sample.box.top).toBeGreaterThanOrEqual(0);
            expect(sample.box.bottom).toBeLessThanOrEqual(ink);
            if (sample.phase === 'seated' && seen.has('sitting')) break;
            await page.waitForTimeout(10);
          }
          expect(seen).toEqual(new Set(['seated', 'standing', 'walking', 'sitting']));
        });
      }
    }
  }
});

test.describe('focus indicators and the top of the page', () => {
  for (const locale of LOCALES) {
    for (const width of [800, 1280]) {
      test(`rises clear of the focus ring of the link it sits on, ${width} px (${locale})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await openReady(page, pageOf('about', locale).path);
        const rest = await pixelBox(page);
        const links = await mainNav(page).getByRole('link').all();
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
          await link.focus();
          const ring = await link.evaluate((el, outset) => {
            const box = el.getBoundingClientRect();
            return {
              visible: el.matches(':focus-visible'),
              top: box.top + scrollY - outset,
              left: box.left + scrollX - outset,
              right: box.right + scrollX + outset,
            };
          }, NAV_RING_OUTSET);
          expect(ring.visible).toBe(true);
          await expect
            .poll(async () => {
              const box = await pixelBox(page);
              const touches =
                box.bottom > ring.top && box.right > ring.left && box.left < ring.right;
              return touches;
            })
            .toBe(false);
        }
        // Focus leaves the nav: it settles back where it was.
        await page.locator('main').evaluate((main) => (main as HTMLElement).focus());
        await riseSettled(page, 0);
        expect((await pixelBox(page)).bottom).toBe(rest.bottom);
      });
    }
  }

  test('keeps the same ring, moved inside the link, and sits right on top of it', async ({
    page,
  }) => {
    await openReady(page, pageOf('about', 'en').path);
    const active = mainNav(page).locator('a[aria-current="page"]');
    await page.keyboard.press('Tab');
    await active.focus();
    await riseSettled(page, 1);
    const ring = await active.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        outline: `${style.outlineStyle} ${style.outlineWidth}`,
        offset: style.outlineOffset,
        top: el.getBoundingClientRect().top + scrollY + 2,
      };
    });
    expect(ring).toMatchObject({ outline: 'solid 3px', offset: '-5px' });
    const { bottom } = await pixelBox(page);
    expect(bottom).toBeLessThanOrEqual(ring.top);
    // Connected to the ring: the old ring left him 20 px from the label when focused
    expect(ring.top - bottom).toBeLessThanOrEqual(2);
  });

  test('other header controls and the 2D fallback keep the usual ring', async ({ page }) => {
    await openReady(page, pageOf('about', 'en').path);
    const brand = page.locator('header a').first();
    await page.keyboard.press('Tab');
    await brand.focus();
    await expect(brand).toHaveCSS('outline-offset', '2px');
    await canvas(page).evaluate((el) => {
      (el as HTMLCanvasElement)
        .getContext('webgl2')!
        .getExtension('WEBGL_lose_context')!
        .loseContext();
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    const link = mainNav(page).getByRole('link').first();
    await link.focus();
    await expect(link).toHaveCSS('outline-offset', '2px');
  });

  test('a ring far along the nav leaves it where it is', async ({ page }) => {
    await openReady(page, pageOf('home', 'en').path);
    await mainNav(page)
      .getByRole('link', { name: pageOf('contact', 'en').label })
      .focus();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__mascot3d!.motion().rise)).toBe(0);
  });

  test('with reduced motion it clears the ring at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openReady(page, pageOf('about', 'en').path);
    const active = mainNav(page).locator('a[aria-current="page"]');
    await active.focus();
    expect(await page.evaluate(() => window.__mascot3d!.motion().rise)).toBe(1);
    const ringTop = await active.evaluate(
      (el, outset) => el.getBoundingClientRect().top + scrollY - outset,
      NAV_RING_OUTSET,
    );
    expect((await pixelBox(page)).bottom).toBeLessThanOrEqual(ringTop);
  });

  test('walking past a focused link rises above its ring', async ({ page }) => {
    await openReady(page, pageOf('home', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('standing');
    // After a mouse click only keyboard use makes a focus ring show.
    await page.keyboard.press('Tab');
    const middle = mainNav(page).getByRole('link', { name: pageOf('projects', 'en').label });
    await middle.focus();
    const ring = await middle.evaluate((el, outset) => {
      const box = el.getBoundingClientRect();
      return {
        visible: el.matches(':focus-visible'),
        top: box.top + scrollY - outset,
        left: box.left - outset,
        right: box.right + outset,
      };
    }, NAV_RING_OUTSET);
    expect(ring.visible).toBe(true);
    let crossed = false;
    for (let i = 0; i < 600; i += 1) {
      const sample = await page.evaluate(() => ({
        phase: window.__mascot3d!.state().phase,
        box: window.__mascot3d!.pixelBox()!,
      }));
      if (sample.box.right > ring.left && sample.box.left < ring.right) {
        crossed = true;
        expect(sample.box.bottom).toBeLessThanOrEqual(ring.top);
      }
      if (sample.phase === 'seated' && crossed) break;
      await page.waitForTimeout(10);
    }
    expect(crossed).toBe(true);
  });

  test('the design for the jump keeps the head on the page in every sampled frame', async ({
    page,
  }) => {
    await openReady(page, pageOf('about', 'en').path);
    const top = await page.evaluate(() => window.__mascot3d!.jumpReach(24));
    // The clip really does rise above the standing height: otherwise this proves nothing.
    expect(top).toBeGreaterThan(1.1);
    const { restLine, ringLine } = await page.evaluate(() => window.__mascot3d!.anchor()!);
    const feet = headSafeFeetY(Math.min(restLine, ringLine), top, TARGET_SIZE);
    expect(feet - top * TARGET_SIZE).toBeGreaterThanOrEqual(0);
  });
});

test.describe('fallback to the 2D mascot', () => {
  test('no WebGL: 3D never starts and the 2D mascot still walks', async ({ page }) => {
    await page.addInitScript(() => {
      // The site draws nothing else on a canvas, so no context of any kind is the simplest stand-in.
      HTMLCanvasElement.prototype.getContext = (() => null) as never;
    });
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await open(page, pageOf('about', 'en').path);
    await page.waitForTimeout(2500);
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
    expect(requests.filter((u) => /\.glb|engine-/.test(u))).toEqual([]);
    await clickNav(page, pageOf('projects', 'en').label);
    await expect(headerMascot(page).locator('> div')).toHaveAttribute(
      'data-pose',
      /walking|pointing/,
    );
  });

  test('a failed model: the 2D mascot stays', async ({ page }) => {
    await page.route('**/*.glb', (route) => route.abort());
    await open(page, pageOf('about', 'en').path);
    await page.waitForTimeout(2500);
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
    await expect(canvas(page)).toHaveCount(0);
  });

  test('a lost context: the 2D mascot takes over at the right place, with no retry', async ({
    page,
  }) => {
    await openReady(page, pageOf('about', 'en').path);
    await canvas(page).evaluate((el) => {
      (el as HTMLCanvasElement)
        .getContext('webgl2')!
        .getExtension('WEBGL_lose_context')!
        .loseContext();
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(canvas(page)).toHaveCount(0);
    await expect(headerMascot(page)).toHaveCSS('visibility', 'visible');
    await clickNav(page, pageOf('projects', 'en').label);
    // It really walks there: under load the route can take a moment to commit.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const walker = document
              .querySelector('[data-mascot="header"] > div')!
              .getBoundingClientRect();
            const link = document
              .querySelector('[data-nav="main"] a[aria-current="page"]')!
              .getBoundingClientRect();
            return Math.abs(walker.left + walker.width / 2 - (link.left + link.width / 2));
          }),
        { timeout: 10_000 },
      )
      .toBeLessThanOrEqual(2);
    // No retry: 3D stays off, however long it waits.
    await page.waitForTimeout(1000);
    await expect(canvas(page)).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
  });

  test('below the desktop width nothing 3D is requested', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page, pageOf('about', 'en').path);
    await page.waitForTimeout(2500);
    expect(requests.filter((u) => /\.glb|engine-/.test(u))).toEqual([]);
    await expect(canvas(page)).toHaveCount(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('moves instantly, never walks, and draws only on change', async ({ page }) => {
    await openReady(page, pageOf('about', 'en').path);
    await startTrace(page);
    const before = await page.evaluate(() => window.__mascot3d!.frames());
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__mascot3d!.frames())).toBe(before);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
    const phases = await page.evaluate(() => window.__trace!.map((t) => t.phase));
    expect(new Set(phases)).toEqual(new Set(['seated']));
  });

  test('follows the setting when it changes mid-trip', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openReady(page, pageOf('home', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('walking');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitSeated(page);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });
});

test.describe('accessibility and non-interference', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`axe finds nothing, ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await openReady(page, pageOf('about', 'en').path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('is hidden from assistive technology and out of the tab order', async ({ page }) => {
    await openReady(page, '/');
    await expect(page.locator('[data-mascot3d="overlay"]')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-mascot3d="overlay"]')).toHaveCSS('pointer-events', 'none');
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () => document.activeElement?.closest('[data-mascot3d="overlay"]') !== null,
      );
      expect(inside).toBe(false);
    }
  });

  test('never blocks a nav link', async ({ page }) => {
    await openReady(page, '/');
    for (const link of await mainNav(page).getByRole('link').all()) {
      const hit = await link.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + 2);
        return top === element || element.contains(top);
      });
      expect(hit).toBe(true);
    }
  });

  test('causes no layout shift and no horizontal overflow', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __shifts: unknown[] }).__shifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          sources: { node: Element | null }[];
        }[]) {
          for (const source of entry.sources ?? []) {
            if (source.node?.closest?.('[data-mascot3d="overlay"]')) {
              (window as unknown as { __shifts: unknown[] }).__shifts.push(source);
            }
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openReady(page, pageOf('about', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect.poll(() => phase(page), { timeout: 15_000 }).not.toBe('seated');
    await waitSeated(page);
    expect(
      await page.evaluate(() => (window as unknown as { __shifts: unknown[] }).__shifts.length),
    ).toBe(0);
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('the site’s security headers and rendering budget', () => {
  test('runs under the real CSP with no violations', async ({ page }) => {
    await page.addInitScript(() => {
      window.__violations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        window.__violations!.push(`${event.effectiveDirective}: ${event.blockedURI}`);
      });
    });
    const response = await page.goto(pageOf('about', 'en').path);
    expect(response!.headers()['content-security-policy']).toContain("script-src 'self'");
    await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
    await clickNav(page, pageOf('projects', 'en').label);
    await expect.poll(() => phase(page), { timeout: 15_000 }).not.toBe('seated');
    await waitSeated(page);
    expect(await page.evaluate(() => window.__violations)).toEqual([]);
  });

  test('stops rendering once settled', async ({ page }) => {
    test.setTimeout(30_000);
    await openReady(page, pageOf('about', 'en').path);
    await page.waitForTimeout(5000);
    const frames = await page.evaluate(() => window.__mascot3d!.frames());
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => window.__mascot3d!.frames())).toBe(frames);
  });

  test('pauses while the tab is hidden, then carries on', async ({ page }) => {
    await openReady(page, pageOf('home', 'en').path);
    await clickNav(page, pageOf('contact', 'en').label);
    await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('walking');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);
    const frames = await page.evaluate(() => window.__mascot3d!.frames());
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__mascot3d!.frames())).toBe(frames);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitSeated(page);
    await expect.poll(() => offsetFromActiveLink(page)).toBeLessThanOrEqual(2);
  });
});

test.describe('with the flag off', () => {
  test('the build contains nothing of the 3D mascot', () => {
    test.setTimeout(180_000);
    const here = dirname(fileURLToPath(import.meta.url));
    const out = mkdtempSync(join(tmpdir(), 'flag-off-build-'));
    try {
      const env = { ...process.env };
      delete env['VITE_MASCOT_3D'];
      delete env['VITE_MASCOT_3D_ALLOW_SOFTWARE'];
      execFileSync(
        'npx',
        ['vite', 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'],
        {
          cwd: join(here, '../../apps/shell'),
          env,
          stdio: 'pipe',
        },
      );
      const assets = readdirSync(join(out, 'assets'));
      expect(assets.filter((name) => /\.glb$|^engine|^Mascot3D/.test(name))).toEqual([]);
      for (const name of assets.filter((n) => /\.(js|css)$/.test(n))) {
        const text = readFileSync(join(out, 'assets', name), 'utf8');
        expect(text.includes('WebGLRenderer'), name).toBe(false);
        expect(text.includes('mascot3d'), name).toBe(false);
      }
      expect(JSON.parse(readFileSync(join(out, 'build-mode.json'), 'utf8'))).toEqual({
        mode: 'static',
      });
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
