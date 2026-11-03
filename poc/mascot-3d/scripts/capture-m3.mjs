// M3 evidence from the real shell: the whole sequence as screenshots, and every layout's landing spot.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [base] = process.argv.slice(2);
const OUT = 'poc/mascot-3d/out/m3';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = { landings: [], timing: {} };
const open = async (path, width = 1280, scheme = 'light', height = 800) => {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: scheme,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.mascot3d === 'active', null, {
    timeout: 30000,
  });
  await page.evaluate(() => window.__mascot3d.holdTimer());
  await page.waitForTimeout(150);
  return page;
};
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000, polling: 16 });

// Every layout's landing
for (const width of [800, 1024, 1280, 1920])
  for (const lang of ['', '/pt-br'])
    for (const name of ['', '/about', '/projects', '/architecture', '/contact']) {
      const page = await open(lang + name || '/', width);
      const landing = await page.evaluate(() => {
        const l = window.__mascot3d.landing();
        const c = document.querySelector('[data-fun-fact]').getBoundingClientRect();
        const p = document.querySelector('[data-slot="peek"]')?.getBoundingClientRect();
        return {
          x: l?.x ?? null,
          side: l?.side ?? null,
          cardTop: Math.round(c.top),
          cardLeft: Math.round(c.left),
          cardRight: Math.round(c.right),
          peek: p ? [Math.round(p.left), Math.round(p.right)] : null,
        };
      });
      results.landings.push({ width, lang: lang || 'en', page: name || '/', ...landing });
      await page.context().close();
    }
const none = results.landings.filter((l) => l.x === null);
console.log(
  'layouts',
  results.landings.length,
  'with no landing',
  none.length,
  JSON.stringify(none.map((l) => `${l.width} ${l.lang} ${l.page}`)),
);

// The whole sequence, in each theme and language, on a page with a peeking mascot and on Home
const clipFor = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-fun-fact]').getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(card.left - 330, innerWidth - 1000)),
      y: 0,
      width: 1000,
      height: Math.min(innerHeight, card.top + 170),
    };
  });
for (const [tag, path, scheme, width] of [
  ['about-en-light', '/about', 'light', 1280],
  ['about-en-dark', '/about', 'dark', 1280],
  ['about-pt-light', '/pt-br/about', 'light', 1280],
  ['about-pt-dark', '/pt-br/about', 'dark', 1280],
  ['home-en-light', '/', 'light', 1280],
  ['home-en-dark', '/', 'dark', 1280],
  ['home-pt-800', '/pt-br', 'light', 800],
  ['about-800', '/about', 'light', 800],
]) {
  const page = await open(path, width, scheme);
  const clip = width === 800 ? { x: 0, y: 0, width: 800, height: 470 } : await clipFor(page);
  const shot = (name) => page.screenshot({ path: `${OUT}/${tag}-${name}.png`, clip });
  await shot('1-seated');
  if (!(await page.evaluate(() => window.__mascot3d.landing()))) {
    console.log('no landing:', tag);
    await page.context().close();
    continue;
  }
  await page.evaluate(() => window.__mascot3d.jumpNow());
  await until(page, () => {
    const f = window.__mascot3d.motion().flight;
    return f && f.wait === 0 && f.time > f.arc.duration * 0.45;
  });
  await shot('2-air');
  await until(page, () => window.__mascot3d.motion().point === 1);
  await shot('3-pointing');
  await until(
    page,
    () => window.__mascot3d.state().phase === 'perched' && window.__mascot3d.motion().point === 0,
  );
  await shot('4-perched');
  await page
    .locator('[data-nav="main"] a')
    .nth(tag.startsWith('home') ? 3 : 0)
    .click();
  await until(page, () => {
    const f = window.__mascot3d.motion().flight;
    return (
      window.__mascot3d.state().goal === 'nav' &&
      f &&
      f.wait === 0 &&
      f.time > f.arc.duration * 0.45
    );
  });
  await shot('5-return-air');
  await until(page, () => window.__mascot3d.state().phase === 'walking');
  await page.waitForTimeout(150);
  await shot('6-moving');
  await until(
    page,
    () => window.__mascot3d.state().phase === 'seated' && window.__mascot3d.motion().sit === 1,
  );
  await page.mouse.move(5, 700);
  await page.waitForTimeout(200);
  await shot('7-seated-new');
  results.timing[tag] = await page.evaluate(() => window.__mascot3d.timing());
  await page.context().close();
}
fs.writeFileSync(`${OUT}/measurements.json`, JSON.stringify(results, null, 1));
await browser.close();
