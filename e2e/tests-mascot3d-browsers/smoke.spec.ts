import { expect, type Page, test } from '@playwright/test';
import type {} from '../../apps/shell/src/mascot/three/useMascotDirector.ts';
import { clickNav, horizontalOverflow, open } from '../support/shell.ts';
import { pageOf } from '../support/site.ts';

const html = (page: Page) => page.locator('html');
const canvas = (page: Page) => page.locator('[data-mascot3d="overlay"] canvas');
const phase = (page: Page) => page.evaluate(() => window.__mascot3d!.state().phase);

/** True when this browser can run the 3D character here. Headless WebGL isn't a given. */
async function openAndSettle(page: Page, path: string) {
  await open(page, path);
  await page.waitForTimeout(3000);
  const active = (await html(page).getAttribute('data-mascot3d')) === 'active';
  test
    .info()
    .annotations.push({ type: 'webgl', description: active ? '3D ran' : '2D fallback only' });
  return active;
}

test('the site stays correct, in 3D or on the 2D fallback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const active = await openAndSettle(page, pageOf('about', 'en').path);
  await expect(page.locator('[data-mascot="header"]')).toHaveCSS(
    'visibility',
    active ? 'hidden' : 'visible',
  );
  await clickNav(page, pageOf('contact', 'en').label);
  await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'en').heading);
  expect(await horizontalOverflow(page)).toBe(0);
  expect(errors).toEqual([]);
});

test('no WebGL at all: the 2D mascot works', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never;
  });
  await open(page, pageOf('about', 'en').path);
  await page.waitForTimeout(2500);
  await expect(canvas(page)).toHaveCount(0);
  await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'visible');
  await clickNav(page, pageOf('projects', 'en').label);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const walker = document
          .querySelector('[data-mascot="header"] > div')!
          .getBoundingClientRect();
        const link = document
          .querySelector('[data-nav="main"] a[aria-current="page"]')!
          .getBoundingClientRect();
        return Math.abs(walker.left + walker.width / 2 - (link.left + link.width / 2));
      }),
    )
    .toBeLessThanOrEqual(2);
});

test('no View Transitions and no requestIdleCallback: 3D still works', async ({ page }) => {
  await page.addInitScript(() => {
    delete (Document.prototype as unknown as Record<string, unknown>)['startViewTransition'];
    delete (window as unknown as Record<string, unknown>)['requestIdleCallback'];
  });
  const active = await openAndSettle(page, pageOf('about', 'en').path);
  await clickNav(page, pageOf('projects', 'en').label);
  await expect(page.locator('main h1')).toHaveText(pageOf('projects', 'en').heading);
  test.skip(!active, 'No WebGL in this headless browser: the fallback was checked above.');
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe('seated');
  await expect(canvas(page)).toHaveCount(1);
});

test('the whole sequence: seated, jump, card, return, seated', async ({ page }) => {
  const active = await openAndSettle(page, pageOf('about', 'en').path);
  test.skip(!active, 'No WebGL in this headless browser: the fallback was checked above.');
  await page.evaluate(() => window.__mascot3d!.holdTimer());
  await expect.poll(() => phase(page), { timeout: 20_000 }).toBe('seated');
  const seated = await page.evaluate(() => window.__mascot3d!.pixelBox());
  expect(seated).not.toBeNull();
  await page.evaluate(() => window.__mascot3d!.jumpNow());
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe('perched');
  const top = await page
    .locator('[data-fun-fact]')
    .evaluate((card) => card.getBoundingClientRect().top + scrollY);
  const box = await page.evaluate(() => window.__mascot3d!.pixelBox()!);
  expect(Math.abs(box.bottom - top)).toBeLessThanOrEqual(3);
  await clickNav(page, pageOf('home', 'en').label);
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe('seated');
  await expect(canvas(page)).toHaveCount(1);
  expect(await horizontalOverflow(page)).toBe(0);
});

test('a lost context restores the 2D mascot', async ({ page }) => {
  const active = await openAndSettle(page, pageOf('about', 'en').path);
  test.skip(!active, 'No WebGL in this headless browser: the fallback was checked above.');
  await canvas(page).evaluate((element) => {
    (element as HTMLCanvasElement)
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext();
  });
  await expect(canvas(page)).toHaveCount(0);
  await expect(page.locator('[data-mascot="header"]')).toHaveCSS('visibility', 'visible');
});

test('runs under the real CSP with no violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/content.security.policy|violates/i.test(message.text())) violations.push(message.text());
  });
  const response = await page.goto(pageOf('about', 'en').path);
  expect(response!.headers()['content-security-policy']).toContain("script-src 'self'");
  await page.waitForTimeout(3000);
  expect(violations).toEqual([]);
});
