import { expect, type Page, test } from '@playwright/test';
import sharp from 'sharp';
import { TARGET_SIZE } from '../../apps/shell/src/mascot/three/anchors.ts';
import type { PixelBox } from '../../apps/shell/src/mascot/three/engine.ts';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { open } from '../support/shell.ts';
import { messages, pageOf } from '../support/site.ts';

// The character himself, at his real size. Colours and shapes are measured, never compared to a picture.

const canvas = (page: Page) => page.locator('[data-mascot3d="overlay"] canvas');
const phase = (page: Page) => page.evaluate(() => window.__mascot3d!.state().phase);
const box = (page: Page) => page.evaluate(() => window.__mascot3d!.pixelBox()) as Promise<PixelBox>;

async function openHeld(page: Page, colorScheme: 'light' | 'dark' = 'light') {
  await page.emulateMedia({ colorScheme });
  await open(page, pageOf('about', 'en').path);
  await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe('seated');
}

/** What the screen shows around him, as counted colours. */
async function colours(page: Page) {
  const b = await box(page);
  const margin = 2;
  const clip = {
    x: Math.max(0, Math.floor(b.left) - margin),
    y: Math.max(0, Math.floor(b.top) - margin),
    width: Math.ceil(b.right - b.left) + margin * 2,
    height: Math.ceil(b.bottom - b.top) + margin * 2,
  };
  const { data, info } = await sharp(await page.screenshot({ clip }))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const count = { tie: 0, skin: 0, shirt: 0, dark: 0 };
  for (let i = 0; i < info.width * info.height; i += 1) {
    const [r, g, bl] = [data[i * 3] ?? 0, data[i * 3 + 1] ?? 0, data[i * 3 + 2] ?? 0];
    if (r > 110 && g < 70 && bl < 70) count.tie += 1;
    if (r > 190 && g > 110 && g < 210 && bl > 50 && bl < 160 && r > bl * 1.4) count.skin += 1;
    if (r > 190 && g > 190 && bl > 190) count.shirt += 1;
    if (r < 70 && g < 70 && bl < 75) count.dark += 1;
  }
  return { ...count, buffer: data };
}

test.describe('his model and texture', () => {
  test('load from this origin, under the real headers, with no violations', async ({ page }) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      (window as unknown as { __v: string[] }).__v = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        (window as unknown as { __v: string[] }).__v.push(event.blockedURI);
      });
    });
    const assets: { url: string; status: number }[] = [];
    page.on('response', (response) => {
      if (/\/(bruno|base)-[^/]*\.(glb|webp)$/.test(response.url())) {
        assets.push({ url: response.url(), status: response.status() });
      }
    });
    page.on('console', (message) => {
      if (/content security policy/i.test(message.text())) violations.push(message.text());
    });
    await openHeld(page);
    const origin = new URL(page.url()).origin;
    expect(assets.map(({ url }) => url.split('.').pop()).sort()).toEqual(['glb', 'webp']);
    for (const { url, status } of assets) {
      expect(status).toBe(200);
      expect(new URL(url).origin).toBe(origin);
    }
    expect(violations).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __v: string[] }).__v)).toEqual([]);
  });

  test('a texture that can’t be fetched: the 2D mascot stays', async ({ page }) => {
    await page.route(/\/base-[^/]*\.webp$/, (route) => route.abort());
    await open(page, pageOf('about', 'en').path);
    await page.waitForTimeout(2500);
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', 'active');
    await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'visible');
    await expect(canvas(page)).toHaveCount(0);
  });
});

test.describe('held poses never fall back to rest', () => {
  test('seated, through the idle and long after it stops rendering', async ({ page }) => {
    await openHeld(page);
    const { size, metrics, restLine } = await page.evaluate(() => {
      const { size, metrics, restLine } = window.__mascot3d!.anchor()!;
      return { size, metrics, restLine };
    });
    for (const wait of [0, 800, 2000, 3000]) {
      await page.waitForTimeout(wait);
      const b = await box(page);
      expect(
        Math.abs(b.bottom - b.top - (metrics.seatedTop - metrics.seatedBottom) * size),
      ).toBeLessThanOrEqual(3);
      // Nothing hangs below the seat, over the label.
      expect(b.bottom).toBeLessThanOrEqual(restLine + 1);
    }
    // Asked for the same pose again and again, the mixer has nothing new to write.
    const first = await page.evaluate(() => window.__mascot3d!.measurePose({ sit: 1 }));
    const again = await page.evaluate(() => window.__mascot3d!.measurePose({ sit: 1 }));
    expect(again).toEqual(first);
    expect(first!.top).toBeLessThan(0.9 * metrics.standingTop);
  });

  test('pointing, with either arm, for as long as it lasts', async ({ page }) => {
    await openHeld(page);
    for (const arm of ['L', 'R'] as const) {
      const standing = await page.evaluate(() => window.__mascot3d!.measurePose({}));
      const samples = await page.evaluate(
        (side) => [0, 1, 2].map(() => window.__mascot3d!.measurePose({ point: 1, arm: side })),
        arm,
      );
      expect(samples[1]).toEqual(samples[0]);
      expect(samples[2]).toEqual(samples[0]);
      if (arm === 'L') expect(samples[0]!.right).toBeGreaterThan(standing!.right + 0.03);
      else expect(samples[0]!.left).toBeLessThan(standing!.left - 0.03);
    }
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await expect.poll(() => phase(page), { timeout: 20_000 }).toBe('pointing');
    await expect
      .poll(() => page.evaluate(() => window.__mascot3d!.motion().point), { intervals: [20] })
      .toBe(1);
    const widths = [];
    while ((await page.evaluate(() => window.__mascot3d!.motion().point)) === 1) {
      const b = await box(page);
      widths.push(b.right - b.left);
      await page.waitForTimeout(100);
    }
    expect(widths.length).toBeGreaterThan(2);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(2);
  });
});

test.describe('his look, at his real size', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${colorScheme} theme: at his real size, he reads as himself`, async ({ page }) => {
      await openHeld(page, colorScheme);
      const { size, ringLine, standingTop } = await page.evaluate(() => {
        const { size, ringLine, metrics } = window.__mascot3d!.anchor()!;
        return { size, ringLine, standingTop: metrics.standingTop };
      });
      expect(size).toBeCloseTo(Math.min(TARGET_SIZE, (ringLine - 1) / standingTop));
      expect(size * standingTop).toBeGreaterThanOrEqual(TARGET_SIZE);
      const { tie, skin, shirt, dark } = await colours(page);
      expect(tie).toBeGreaterThanOrEqual(3);
      expect(skin).toBeGreaterThanOrEqual(25);
      expect(shirt).toBeGreaterThanOrEqual(1);
      expect(dark).toBeGreaterThanOrEqual(colorScheme === 'light' ? 60 : 20);
    });
  }

  test('light: an unlit model with its outline, and no halo', async ({ page }) => {
    await openHeld(page, 'light');
    expect(await page.evaluate(() => window.__mascot3d!.outlineVisible())).toBe(true);
    await expect(canvas(page)).toHaveCSS('filter', 'none');
  });

  test('dark: the halo, and no outline', async ({ page }) => {
    await openHeld(page, 'dark');
    expect(await page.evaluate(() => window.__mascot3d!.outlineVisible())).toBe(false);
    await expect(canvas(page)).toHaveCSS('filter', /drop-shadow/);
    // It really reaches the screen, around him.
    const withHalo = (await colours(page)).buffer;
    await canvas(page).evaluate((el) => ((el as HTMLElement).style.filter = 'none'));
    const without = (await colours(page)).buffer;
    let changed = 0;
    for (let i = 0; i < without.length; i += 1) {
      if (Math.abs((withHalo[i] ?? 0) - (without[i] ?? 0)) > 4) changed += 1;
    }
    expect(changed).toBeGreaterThan(20);
  });

  test('switching the theme at rest swaps them at once, with nothing else changing', async ({
    page,
  }) => {
    await openHeld(page, 'light');
    await page.waitForTimeout(4500);
    const before = await page.evaluate(() => ({
      frames: window.__mascot3d!.frames(),
      memory: window.__mascot3d!.memory(),
      x: window.__mascot3d!.motion().x,
    }));
    const toggle = page.getByRole('button', { name: messages.en.layout.themeToggle, exact: true });
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(canvas(page)).toHaveCSS('filter', /drop-shadow/);
    const after = await page.evaluate(() => ({
      frames: window.__mascot3d!.frames(),
      memory: window.__mascot3d!.memory(),
      x: window.__mascot3d!.motion().x,
      outline: window.__mascot3d!.outlineVisible(),
    }));
    expect(after.outline).toBe(false);
    expect(after.frames).toBeGreaterThan(before.frames);
    expect(after.memory).toEqual(before.memory);
    expect(after.x).toBe(before.x);
    expect(await phase(page)).toBe('seated');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => window.__mascot3d!.outlineVisible())).toBe(true);
    await expect(canvas(page)).toHaveCSS('filter', 'none');
  });

  test('a character with no look has no halo and no outline', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page, `${pageOf('about', 'en').path}?mascot-character=fixture`);
    await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
    await expect(canvas(page)).toHaveCSS('filter', 'none');
    expect(await page.evaluate(() => window.__mascot3d!.outlineVisible())).toBe(false);
  });
});

test.describe('the room above the card, in 3D', () => {
  const PAGES = ['about', 'projects', 'architecture', 'contact'];
  const room = (page: Page) =>
    page.evaluate(() => {
      const header = document.querySelector('header')!.getBoundingClientRect();
      const card = document.querySelector('[data-fun-fact]')!.getBoundingClientRect();
      return card.top - header.bottom;
    });

  for (const width of [1920, 1280, 1024, 1023, 900, 800, 768]) {
    test(`${width} px: the same on every inner page, and he fits on it`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const id of PAGES) {
        await open(page, pageOf(id, 'en').path);
        await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
        await page.evaluate(() => window.__mascot3d!.holdTimer());
        expect(Math.abs((await room(page)) - 72)).toBeLessThanOrEqual(1);
      }
      await expect.poll(() => phase(page), { timeout: 30_000 }).toBe('seated');
      await page.evaluate(() => window.__mascot3d!.jumpNow());
      await expect.poll(() => phase(page), { timeout: 20_000 }).toBe('pointing');
      await expect
        .poll(() => page.evaluate(() => window.__mascot3d!.motion().point), { intervals: [20] })
        .toBe(1);
      const b = await box(page);
      const edges = await page.evaluate(() => ({
        header: document.querySelector('header')!.getBoundingClientRect().bottom,
        card: document.querySelector('[data-fun-fact]')!.getBoundingClientRect().top + scrollY,
      }));
      expect(Math.abs(b.bottom - edges.card)).toBeLessThanOrEqual(3);
      expect(b.top).toBeGreaterThanOrEqual(edges.header);
    });
  }

  test('nothing shifts as he travels from the nav to the card and back', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __shift: number }).__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          (window as unknown as { __shift: number }).__shift += (
            entry as unknown as { value: number }
          ).value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openHeld(page);
    const before = await room(page);
    await page.evaluate(() => window.__mascot3d!.jumpNow());
    await expect.poll(() => phase(page), { timeout: 20_000 }).toBe('perched');
    expect(await room(page)).toBe(before);
    expect(
      await page.evaluate(() => (window as unknown as { __shift: number }).__shift),
    ).toBeLessThan(0.01);
  });

  test('a real 2D fallback gets back the room its head needs', async ({ page }) => {
    await page.route(/\/bruno-[^/]*\.glb$/, (route) => route.abort());
    await open(page, pageOf('about', 'en').path);
    await expect(page.locator('html')).toHaveAttribute('data-mascot2d', '', { timeout: 15_000 });
    expect(await room(page)).toBeGreaterThan(130);
    await expect(page.locator('[data-slot="peek"]')).toHaveCSS('visibility', 'visible');
  });

  test('Home and phones keep their layout', async ({ page }) => {
    await openHeldHome(page);
    const stage = await page.evaluate(
      () => document.querySelector('[data-slot="frame"]')!.getBoundingClientRect().top,
    );
    expect(stage).toBeGreaterThan(0);
    await expect(page.locator('[data-slot="presenter"]')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pageOf('about', 'en').path);
    const strip = await page.evaluate(() => {
      const frame = document.querySelector('[data-slot="frame"]')!.getBoundingClientRect();
      const card = document.querySelector('[data-fun-fact]')!.getBoundingClientRect();
      return card.top - frame.top;
    });
    expect(strip).toBeGreaterThan(70);
    await expect(page.locator('[data-slot="peek"]')).toHaveCSS('visibility', 'visible');
  });
});

async function openHeldHome(page: Page) {
  await open(page, '/');
  await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
}
