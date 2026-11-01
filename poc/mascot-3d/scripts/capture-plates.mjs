// Screenshots of the current site for the film. Read-only: the overrides exist only in this browser.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';

const base = process.argv[2];
const browser = await chromium.launch();
const geometry = {};
fs.mkdirSync('public/plates', { recursive: true });
for (const [theme, pages] of [
  ['light', ['', 'about', 'projects']],
  ['dark', ['', 'about', 'projects']],
]) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: theme,
  });
  const page = await context.newPage();
  for (const name of pages) {
    await page.goto(`${base}/${name}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '[data-mascot="header"]{visibility:hidden!important}' });
    await page.waitForTimeout(500);
    const key = `${theme}-${name || 'home'}`;
    await page.screenshot({ path: `public/plates/${key}.png` });
    geometry[key] = await page.evaluate(() => {
      const box = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      const links = [...document.querySelectorAll('[data-nav="main"] a')].map((a) => {
        const range = document.createRange();
        range.selectNodeContents(a);
        return {
          label: a.textContent,
          active: a.getAttribute('aria-current') === 'page',
          box: box(a.getBoundingClientRect()),
          text: box(range.getBoundingClientRect()),
        };
      });
      return {
        theme: document.documentElement.dataset.theme,
        links,
        card: box(document.querySelector('[data-fun-fact]').getBoundingClientRect()),
        header: box(document.querySelector('header').getBoundingClientRect()),
      };
    });
  }
  await context.close();
}
fs.writeFileSync('public/plates/geometry.json', JSON.stringify(geometry, null, 1));
await browser.close();
