// Compares sitting positions and focus indicators on the real nav, and measures how much of each
// indicator the character hides, from pixels. Styles are injected here only, in this browser.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import sharp from '../../../node_modules/sharp/dist/index.cjs';
import fs from 'node:fs';
const base = process.argv[2];
const OUT = 'poc/mascot-3d/out/m2/focus-compare';
fs.mkdirSync(OUT, { recursive: true });
const LINK = '[data-nav="main"] a:focus-visible';
const VARIANTS = {
  'A-today': { rest: 68, rising: 51, css: '' },
  'B-compact-rise': { rest: 68, rising: 58, css: `${LINK}{outline-offset:-5px}` },
  'C-compact-no-rise': { rest: 68, rising: 68, css: `${LINK}{outline-offset:-5px}` },
  'D-open-top-no-rise': {
    rest: 68,
    rising: 68,
    css: `${LINK}{outline:3px solid transparent;outline-offset:-3px;box-shadow:inset 3px 0 0 var(--color-focus),inset -3px 0 0 var(--color-focus),inset 0 -3px 0 var(--color-focus);background:color-mix(in srgb,var(--color-focus) 12%,transparent)}`,
  },
};
const browser = await chromium.launch();
const results = {};
const clip = { x: 600, y: 0, width: 560, height: 125 };
async function raw(page, c) {
  const { data, info } = await sharp(await page.screenshot({ clip: c }))
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, ch: info.channels, w: info.width, h: info.height };
}
const differs = (a, b, i, t = 30) =>
  Math.abs(a.data[i] - b.data[i]) +
    Math.abs(a.data[i + 1] - b.data[i + 1]) +
    Math.abs(a.data[i + 2] - b.data[i + 2]) >
  t;
for (const scheme of ['light', 'dark'])
  for (const [lang, prefix] of [
    ['en', ''],
    ['pt', '/pt-br'],
  ]) {
    for (const [name, v] of Object.entries(VARIANTS)) {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
      await page.goto(`${base}${prefix}/about`, { waitUntil: 'networkidle' });
      await page.waitForFunction(
        () => document.documentElement.dataset.mascot3d === 'active',
        null,
        { timeout: 30000 },
      );
      if (v.css) await page.addStyleTag({ content: v.css });
      await page.evaluate(
        ([rest, rising]) => window.__mascot3d.setLines(rest, rising),
        [v.rest, v.rising],
      );
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/${name}-${lang}-${scheme}-rest.png`, clip });
      const overlay = page.locator('[data-mascot3d="overlay"]');
      const hide = (value) =>
        overlay.evaluate((el, x) => {
          el.style.visibility = x;
        }, value);
      await hide('hidden');
      const noFocus = await raw(page, clip);
      await page.keyboard.press('Tab');
      const active = page.locator('[data-nav="main"] a[aria-current="page"]');
      await active.focus();
      await page.waitForTimeout(350);
      const focusedNoChar = await raw(page, clip);
      await hide('');
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${OUT}/${name}-${lang}-${scheme}-focus.png`, clip });
      const focusedChar = await raw(page, clip);
      let indicator = 0,
        hidden = 0;
      for (let i = 0; i < noFocus.data.length; i += noFocus.ch) {
        if (differs(noFocus, focusedNoChar, i)) {
          indicator++;
          if (differs(focusedNoChar, focusedChar, i)) hidden++;
        }
      }
      const state = await page.evaluate(() => ({
        box: window.__mascot3d.pixelBox(),
        fv: document.activeElement.matches(':focus-visible'),
      }));
      results[`${name} ${lang} ${scheme}`] = {
        focusVisible: state.fv,
        charBottom: state.box.bottom,
        charTop: state.box.top,
        indicatorHiddenPct: +((100 * hidden) / indicator).toFixed(1),
      };
      await ctx.close();
    }
  }
console.log(JSON.stringify(results));
fs.writeFileSync(`${OUT}/measurements.json`, JSON.stringify(results, null, 1));
await browser.close();
