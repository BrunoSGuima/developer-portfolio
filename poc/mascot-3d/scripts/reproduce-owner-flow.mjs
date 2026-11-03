// The owner's setup: display scale 1.1. Every way of arriving at Projects must end resting on the label.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [base] = process.argv.slice(2);
const OUT = 'poc/mascot-3d/out/m2/final';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};
const seated = (page) =>
  page.waitForFunction(
    () =>
      window.__mascot3d?.state().phase === 'seated' &&
      window.__mascot3d.motion().rise === 0 &&
      window.__mascot3d.motion().sit === 1,
    null,
    { timeout: 30000 },
  );
const read = (page) =>
  page.evaluate(() => ({
    bottom: window.__mascot3d.pixelBox().bottom,
    top: window.__mascot3d.pixelBox().top,
    rise: window.__mascot3d.motion().rise,
    size: window.__mascot3d.size(),
    activeTag: document.activeElement?.tagName,
  }));
const open = async (scheme = 'light', path = '/') => {
  const ctx = await browser.newContext({
    viewport: { width: 1164, height: 727 },
    deviceScaleFactor: 1.1,
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.mascot3d === 'active', null, {
    timeout: 30000,
  });
  await page.waitForTimeout(200);
  return page;
};
const projects = (page) => page.locator('[data-nav="main"] a').nth(2);
let page = await open('light', '/projects');
results['direct load'] = await read(page);
await page.screenshot({
  path: `${OUT}/owner-view-direct-load.png`,
  clip: { x: 300, y: 0, width: 628, height: 200 },
});
await page.context().close();
page = await open();
await projects(page).click();
await page
  .waitForFunction(() => window.__mascot3d.state().phase !== 'seated', null, { timeout: 5000 })
  .catch(() => {});
await seated(page);
results['mouse click'] = await read(page);
await page.mouse.move(5, 500);
await page.waitForTimeout(250);
await page.screenshot({
  path: `${OUT}/owner-view-after-click.png`,
  clip: { x: 300, y: 0, width: 628, height: 200 },
});
await page.context().close();
page = await open();
await page.keyboard.press('Tab');
await projects(page).focus();
await page.keyboard.press('Enter');
await page
  .waitForFunction(() => window.__mascot3d.state().phase !== 'seated', null, { timeout: 5000 })
  .catch(() => {});
await seated(page);
results['keyboard Enter'] = await read(page);
await page.context().close();
page = await open('dark', '/about');
await projects(page).click();
await page
  .waitForFunction(() => window.__mascot3d.state().phase !== 'seated', null, { timeout: 5000 })
  .catch(() => {});
await seated(page);
await page.goBack();
await page
  .waitForFunction(() => window.__mascot3d.state().phase !== 'seated', null, { timeout: 5000 })
  .catch(() => {});
await seated(page);
results['browser back, dark'] = await read(page);
await page.context().close();
// Focused state on the final build, four combinations
for (const [name, scheme, path] of [
  ['en-light', 'light', '/about'],
  ['en-dark', 'dark', '/about'],
  ['pt-light', 'light', '/pt-br/about'],
  ['pt-dark', 'dark', '/pt-br/about'],
]) {
  page = await open(scheme, path);
  await page.screenshot({
    path: `${OUT}/${name}-rest.png`,
    clip: { x: 300, y: 0, width: 628, height: 125 },
  });
  const rest = await read(page);
  await page.keyboard.press('Tab');
  await page.locator('[data-nav="main"] a[aria-current="page"]').focus();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${OUT}/${name}-focus.png`,
    clip: { x: 300, y: 0, width: 628, height: 125 },
  });
  const focus = await read(page);
  const ring = await page.evaluate(() => {
    const a = document.activeElement,
      c = getComputedStyle(a);
    return {
      top: +(
        a.getBoundingClientRect().top -
        parseFloat(c.outlineWidth) -
        parseFloat(c.outlineOffset)
      ).toFixed(2),
      width: c.outlineWidth,
      offset: c.outlineOffset,
    };
  });
  results[`${name}`] = { restBottom: rest.bottom, focusBottom: focus.bottom, ring };
  await page.context().close();
}
fs.writeFileSync(`${OUT}/measurements.json`, JSON.stringify(results, null, 1));
for (const [k, v] of Object.entries(results)) console.log(k.padEnd(20), JSON.stringify(v));
await browser.close();
