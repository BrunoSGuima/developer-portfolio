import { expect, test, type Page } from '@playwright/test';
import { servedAsPages } from '../support/mode.ts';

/**
 * The published build's 3D mascot (ADR-0018). The rest of this suite sees that build as a visitor
 * without a GPU would, because a headless browser has only a software renderer, which it refuses.
 * The detailed behaviour is tested on the mascot's own build (tests-mascot3d). This checks what
 * differs: the real gates, the real bundle and the debug surface.
 */
test.skip(!servedAsPages, 'only the Cloudflare Pages build has the 3D mascot');

/** Makes the browser report a hardware renderer, so the published build's own check lets 3D run. */
const reportHardwareGpu = (page: Page) =>
  page.addInitScript(() => {
    const UNMASKED_RENDERER = 0x9246;
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its own `this`
      const original = context.prototype.getParameter;
      context.prototype.getParameter = function (this: WebGLRenderingContext, name: number) {
        return name === UNMASKED_RENDERER
          ? 'ANGLE (Test GPU)'
          : (original.call(this, name) as unknown);
      } as typeof original;
    }
  });

const modelRequests = (page: Page) => {
  const seen: string[] = [];
  page.on('request', (request) => {
    if (/\.glb$|\/engine-/.test(new URL(request.url()).pathname)) seen.push(request.url());
  });
  return seen;
};

test.describe('at a desktop width', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('with a GPU, 3D runs under the real headers with its fixed facts', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await reportHardwareGpu(page);

    await page.goto('/about');
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-mascot3d', 'active', { timeout: 20_000 });
    await expect(root).not.toHaveAttribute('data-mascot2d', /.*/);
    await expect(page.locator('[data-fun-fact-mascot]')).toContainText('Meet My 3D Mascot!');
    await expect(page.locator('[data-mascot="header"]').first()).toBeHidden();

    await page.goto('/projects');
    await expect(root).toHaveAttribute('data-mascot3d', 'active', { timeout: 20_000 });
    await expect(page.locator('[data-fun-fact-mascot]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('a published build exposes only report(), for diagnosing a GPU', async ({ page }) => {
    await reportHardwareGpu(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active', {
      timeout: 20_000,
    });
    const hook = await page.evaluate(() => {
      const debug = (window as unknown as { __mascot3d: Record<string, () => string> }).__mascot3d;
      return { keys: Object.keys(debug), report: debug['report']?.() };
    });
    expect(hook.keys).toEqual(['report']);
    expect(hook.report).toMatch(/Test GPU/);
  });

  test('test characters are ignored', async ({ page }) => {
    await reportHardwareGpu(page);
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/?mascot-character=robot');
    await expect(page.locator('html')).toHaveAttribute('data-mascot3d', 'active', {
      timeout: 20_000,
    });
    const models = requests.filter((url) => url.endsWith('.glb'));
    expect(models).toHaveLength(1);
    expect(models[0]).toMatch(/bruno/);
  });

  test('with only a software renderer, the 2D mascots and original facts stay', async ({
    page,
  }) => {
    const requested = modelRequests(page);
    await page.goto('/about');
    await expect(page.locator('html')).toHaveAttribute('data-mascot2d', '', { timeout: 20_000 });
    await expect(page.locator('[data-fun-fact-mascot]')).toHaveCount(0);
    await expect(page.locator('[data-mascot="header"]').first()).toBeVisible();
    expect(requested).toEqual([]);
  });

  test('the Architecture page says what runs, in both languages', async ({ page }) => {
    for (const path of ['/architecture', '/pt-br/architecture']) {
      await page.goto(path);
      await expect(page.locator('main')).toContainText('Three.js');
    }
  });
});

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phones only');

  test('nothing of the engine or the model loads, and the facts are the originals', async ({
    page,
  }) => {
    await reportHardwareGpu(page);
    const requested = modelRequests(page);
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    expect(requested).toEqual([]);
    await expect(page.locator('[data-fun-fact-mascot]')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-mascot3d', /.*/);
  });
});
