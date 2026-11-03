// node scripts/render-film.mjs <baseUrl> <fps> <start> <end>, or "still t1,t2,..."
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [base, a, b, c] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
await page.goto(`${base}/stage?mode=film`);
await page.waitForFunction(() => window.__ready === true && window.__film, null, {
  timeout: 90000,
});
const duration = await page.evaluate(() => window.__film.duration);
console.log('duration', duration, JSON.stringify(await page.evaluate(() => window.__seat)));
if (a === 'still') {
  fs.mkdirSync('out/check', { recursive: true });
  for (const t of b.split(',')) {
    await page.evaluate((v) => window.__film.renderAt(Number(v)), t);
    await page.screenshot({ path: `out/check/t${t}.png` });
  }
} else {
  fs.mkdirSync('out/frames', { recursive: true });
  const fps = Number(a),
    start = Number(b),
    end = Math.min(Number(c), Math.ceil(duration * fps));
  // Scenes build their DOM on first entry, so a worker starting mid-film must enter the scene first
  for (let i = start; i < end; i++) {
    await page.evaluate((v) => window.__film.renderAt(v), i / fps);
    await page.screenshot({
      path: `out/frames/f${String(i).padStart(5, '0')}.jpg`,
      type: 'jpeg',
      quality: 95,
    });
  }
}
await browser.close();
