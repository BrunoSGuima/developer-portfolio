// Where each nav label's ink really starts: from its pixels, and from font metrics in the page.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import sharp from '../../../node_modules/sharp/dist/index.cjs';
const base = process.argv[2];
const browser = await chromium.launch();
for (const [path, width, scheme] of [
  ['/about', 1280, 'light'],
  ['/about', 1280, 'dark'],
  ['/pt-br/about', 1280, 'light'],
  ['/pt-br/about', 1280, 'dark'],
  ['/about', 800, 'light'],
  ['/pt-br/about', 800, 'light'],
  ['/about', 1920, 'light'],
]) {
  const ctx = await browser.newContext({ viewport: { width, height: 700 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.mascot3d === 'active', null, {
    timeout: 30000,
  });
  await page.evaluate(() => document.fonts.ready);
  const box = await page.evaluate(() => window.__mascot3d.pixelBox());
  await page.addStyleTag({ content: '[data-mascot3d="overlay"]{visibility:hidden!important}' });
  const links = page.locator('[data-nav="main"] a');
  const rows = [];
  for (let i = 0; i < (await links.count()); i++) {
    const info = await links.nth(i).evaluate((a) => {
      const r = document.createRange();
      r.selectNodeContents(a);
      const t = r.getBoundingClientRect();
      const s = getComputedStyle(a);
      const b = a.getBoundingClientRect();
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const m = c.measureText(a.textContent);
      return {
        label: a.textContent,
        boxTop: b.top,
        textTop: t.top,
        textH: t.height,
        x: t.left,
        w: t.width,
        metric: t.top + m.fontBoundingBoxAscent - m.actualBoundingBoxAscent,
        font: s.fontSize + '/' + s.fontWeight,
      };
    });
    if (info.w === 0) continue;
    const clip = {
      x: Math.floor(info.x),
      y: Math.floor(info.boxTop),
      width: Math.ceil(info.w),
      height: 30,
    };
    const png = await page.screenshot({ clip });
    const { data, info: im } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    let ink = null;
    for (let y = 0; y < im.height && ink === null; y++) {
      const bg = [
        data[y * im.width * im.channels],
        data[y * im.width * im.channels + 1],
        data[y * im.width * im.channels + 2],
      ];
      for (let x = 0; x < im.width; x++) {
        const o = (y * im.width + x) * im.channels;
        if (
          Math.abs(data[o] - bg[0]) +
            Math.abs(data[o + 1] - bg[1]) +
            Math.abs(data[o + 2] - bg[2]) >
          150
        ) {
          ink = clip.y + y;
          break;
        }
      }
    }
    rows.push(
      `${info.label}: box ${info.boxTop.toFixed(1)} line ${info.textTop.toFixed(1)} metric ${info.metric.toFixed(1)} INK ${ink}`,
    );
  }
  console.log(
    `\n${path} ${width} ${scheme}: character seated ${box.top}..${box.bottom}\n  ${rows.join('\n  ')}`,
  );
  await ctx.close();
}
await browser.close();
