// Evidence for the M2 positioning refinement: the character against the label, in every state.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.argv[2];
const OUT = 'poc/mascot-3d/out/m2/position';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};
const ready = (p) =>
  p.waitForFunction(() => document.documentElement.dataset.mascot3d === 'active', null, {
    timeout: 30000,
  });
const clip = { x: 600, y: 0, width: 560, height: 125 };
const open = async (path, scheme) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await ready(page);
  await page.waitForTimeout(300);
  return page;
};
for (const [lang, prefix] of [
  ['en', ''],
  ['pt', '/pt-br'],
])
  for (const scheme of ['light', 'dark']) {
    const page = await open(`${prefix}/about`, scheme);
    await page.screenshot({ path: `${OUT}/seated-${lang}-${scheme}.png`, clip });
    const rest = await page.evaluate(() => ({
      box: __mascot3d.pixelBox(),
      anchor: __mascot3d.anchor(),
      size: __mascot3d.size(),
    }));
    // Keyboard focus on the link he sits on
    const links = page.locator('[data-nav="main"] a');
    await page.keyboard.press('Tab');
    const active = page.locator('[data-nav="main"] a[aria-current="page"]');
    await active.focus();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/focused-${lang}-${scheme}.png`, clip });
    const focused = await page.evaluate(() => ({
      box: __mascot3d.pixelBox(),
      rise: __mascot3d.motion().rise,
      ring: document.activeElement.getBoundingClientRect().top - 5,
      fv: document.activeElement.matches(':focus-visible'),
    }));
    await page.locator('main').evaluate((m) => m.focus());
    await page.mouse.move(5, 500);
    await page.waitForTimeout(300);
    // Mouse hover on the link he sits on
    await active.hover();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/hover-${lang}-${scheme}.png`, clip });
    results[`${lang} ${scheme}`] = {
      size: rest.size,
      restLine: rest.anchor.restLine,
      ringLine: rest.anchor.ringLine,
      seatedBottom: rest.box.bottom,
      seatedTop: rest.box.top,
      focus: focused.fv,
      focusedBottom: focused.box.bottom,
      ringTop: +focused.ring.toFixed(2),
      focusedRise: focused.rise,
      links: await links.count(),
    };
    await page.context().close();
  }
// A whole trip
for (const [name, from, i] of [
  ['short', '/about', 2],
  ['long', '/', 4],
]) {
  const page = await open(from, 'light');
  await page.mouse.move(5, 500);
  await page.locator('[data-nav="main"] a').nth(i).click();
  await page.mouse.move(5, 500);
  const seen = {};
  for (let k = 0; k < 700; k++) {
    const s = await page.evaluate(() => ({
      ph: __mascot3d.state().phase,
      sit: __mascot3d.motion().sit,
    }));
    const key =
      s.ph === 'standing'
        ? s.sit > 0.4
          ? 'a-rising'
          : 'b-turning'
        : s.ph === 'walking'
          ? 'c-moving'
          : s.ph === 'sitting'
            ? s.sit < 0.5
              ? 'd-turning-back'
              : 'e-sitting'
            : seen['c-moving']
              ? 'f-seated'
              : null;
    if (key && !seen[key]) {
      seen[key] = 1;
      await page.screenshot({ path: `${OUT}/trip-${name}-${key}.png`, clip });
    }
    if (key === 'f-seated') break;
    await page.waitForTimeout(15);
  }
  await page.context().close();
}
console.log(JSON.stringify(results, null, 1));
fs.writeFileSync(`${OUT}/measurements.json`, JSON.stringify(results, null, 1));
await browser.close();
