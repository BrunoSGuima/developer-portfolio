// M2 evidence from the real shell: screenshots, measurements and frame costs.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [flagged, flagOff] = process.argv.slice(2);
const OUT = 'poc/mascot-3d/out/m2';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = {};
const ready = (p) =>
  p.waitForFunction(() => document.documentElement.dataset.mascot3d === 'active', null, {
    timeout: 30000,
  });
async function newPage(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    ...opts,
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') page.errors.push(m.text());
  });
  return page;
}
const headerClip = (w = 1280) => ({ x: 0, y: 0, width: w, height: 130 });

// Seated, by page, width, language and theme
for (const [name, path, width, scheme] of [
  ['home-light-1280', '/', 1280, 'light'],
  ['about-light-1280', '/about', 1280, 'light'],
  ['contact-dark-1280', '/contact', 1280, 'dark'],
  ['projects-ptbr-800', '/pt-br/projects', 800, 'light'],
  ['home-1920', '/', 1920, 'light'],
]) {
  const page = await newPage({ viewport: { width, height: 900 }, colorScheme: scheme });
  await page.goto(flagged + path, { waitUntil: 'networkidle' });
  await ready(page);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/seated-${name}.png`,
    clip: { x: 0, y: 0, width, height: Math.min(900, 620) },
  });
  report[`seated ${name}`] = await page.evaluate(() => ({
    size: __mascot3d.size(),
    box: __mascot3d.pixelBox(),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  await page.context().close();
}

// A whole trip, frame by frame (light, Home to Contact: runs; About to Projects: walks)
for (const [name, from, linkIndex] of [
  ['walk', '/about', 2],
  ['run', '/', 4],
]) {
  const page = await newPage();
  await page.goto(flagged + from, { waitUntil: 'networkidle' });
  await ready(page);
  await page.locator('[data-nav="main"] a').nth(linkIndex).click();
  const seen = {};
  for (let i = 0; i < 500; i++) {
    const s = await page.evaluate(() => ({
      ph: __mascot3d.state().phase,
      sit: __mascot3d.motion().sit,
      run: __mascot3d.motion().run,
      x: __mascot3d.motion().x,
      vt: document.documentElement.matches(':active-view-transition'),
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
      seen[key] = true;
      await page.screenshot({
        path: `${OUT}/trip-${name}-${key}.png`,
        clip: { x: 600, y: 0, width: 560, height: 125 },
      });
    }
    if (key === 'f-seated') break;
    await page.waitForTimeout(15);
  }
  report[`trip ${name} phases`] = Object.keys(seen);
  report[`trip ${name} JS cost per frame (software)`] = await page.evaluate(() =>
    __mascot3d.timing(),
  );
  report[`trip ${name} errors`] = page.errors;
  await page.context().close();
}

// During the crossfade: is the character there?
{
  const page = await newPage();
  await page.goto(flagged + '/about', { waitUntil: 'networkidle' });
  await ready(page);
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document);
    window.__vt = 0;
    document.startViewTransition = (cb) => {
      window.__vt += 1;
      const t = original(cb);
      window.__vtNames = null;
      t.ready.then(() => {
        window.__vtNames = document
          .getAnimations()
          .map((a) => a.effect?.pseudoElement)
          .filter(Boolean);
      });
      return t;
    };
  });
  await page.locator('[data-nav="main"] a').nth(2).click();
  await page.waitForFunction(() => window.__vtNames, null, { timeout: 5000 }).catch(() => {});
  await page.screenshot({
    path: `${OUT}/during-view-transition.png`,
    clip: { x: 0, y: 0, width: 1280, height: 400 },
  });
  report['view transition'] = await page.evaluate(() => ({
    started: window.__vt,
    pseudo: window.__vtNames,
    canvas: getComputedStyle(document.querySelector('[data-mascot3d="overlay"] canvas'))
      .viewTransitionName,
    sameCanvas: document.querySelectorAll('[data-mascot3d="overlay"] canvas').length,
  }));
  await page.context().close();
}

// Keyboard focus on the link he sits on, and on its neighbour
{
  const page = await newPage();
  await page.goto(flagged + '/about', { waitUntil: 'networkidle' });
  await ready(page);
  const links = page.locator('[data-nav="main"] a');
  const box = await page.evaluate(() => __mascot3d.pixelBox());
  const rows = [];
  for (let i = 0; i < (await links.count()); i++) {
    await links.nth(i).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const a = document.activeElement,
        b = a.getBoundingClientRect(),
        c = getComputedStyle(a);
      return {
        label: a.textContent,
        fv: a.matches(':focus-visible'),
        active: a.getAttribute('aria-current') === 'page',
        ringTop: b.top - parseFloat(c.outlineWidth) - parseFloat(c.outlineOffset),
        width: b.width,
      };
    });
    if (r.width > 0)
      rows.push({
        ...r,
        characterBottom: box.bottom,
        clearance: +(r.ringTop - box.bottom).toFixed(2),
      });
    if (r.active)
      await page.screenshot({
        path: `${OUT}/focus-ring-active-link.png`,
        clip: { x: 600, y: 0, width: 560, height: 125 },
      });
  }
  report['focus clearance'] = rows;
  await page.context().close();
}

// Scrolling: he belongs to the header, which is not sticky
{
  const page = await newPage();
  await page.goto(flagged + '/about', { waitUntil: 'networkidle' });
  await ready(page);
  const before = await page.locator('[data-mascot3d="overlay"] canvas').boundingBox();
  await page.evaluate(() => scrollTo(0, 60));
  await page.waitForTimeout(150);
  const after = await page.locator('[data-mascot3d="overlay"] canvas').boundingBox();
  const frames = await page.evaluate(() => __mascot3d.frames());
  report['scroll 60 px: canvas moved by'] = before.y - after.y;
  await page.screenshot({
    path: `${OUT}/scrolled-60px.png`,
    clip: { x: 0, y: 0, width: 1280, height: 300 },
  });
  void frames;
  await page.context().close();
}

// Stops rendering after the idle
{
  const page = await newPage();
  await page.goto(flagged + '/about', { waitUntil: 'networkidle' });
  await ready(page);
  await page.waitForTimeout(5000);
  const a = await page.evaluate(() => __mascot3d.frames());
  await page.waitForTimeout(2000);
  report['frames rendered during 2 s at rest, after the idle'] =
    (await page.evaluate(() => __mascot3d.frames())) - a;
  await page.context().close();
}

// 2D fallback in the flagged build (no WebGL), and the flag-off site
{
  const page = await newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto(flagged + '/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: `${OUT}/fallback-2d-no-webgl.png`,
    clip: { x: 0, y: 0, width: 1280, height: 400 },
  });
  report['fallback, no WebGL'] = await page.evaluate(() => ({
    active: document.documentElement.dataset.mascot3d ?? null,
    canvas: document.querySelectorAll('[data-mascot3d="overlay"] canvas').length,
    header2d: getComputedStyle(document.querySelector('[data-mascot="header"]')).visibility,
  }));
  await page.context().close();
}
{
  const page = await newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(flagOff + '/about', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: `${OUT}/flag-off.png`,
    clip: { x: 0, y: 0, width: 1280, height: 400 },
  });
  report['flag off, Pages build under the emulator'] = await page.evaluate(() => ({
    overlay: document.querySelectorAll('[data-mascot3d]').length,
    header2d: getComputedStyle(document.querySelector('[data-mascot="header"]')).visibility,
  }));
  report['flag off, 3D requests'] = requests.filter((u) => /\.glb|engine-|Mascot3DHost/.test(u));
  await page.context().close();
}
fs.writeFileSync(`${OUT}/measurements.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await browser.close();
