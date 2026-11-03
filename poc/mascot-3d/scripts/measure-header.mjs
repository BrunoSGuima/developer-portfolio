// Real rects of everything a character at the top of the page could touch, across widths and pages.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.argv[2];
const browser = await chromium.launch();
const rows = [];
for (const width of [800, 1024, 1280, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const lang of ['', '/pt-br'])
    for (const name of ['', '/about', '/projects', '/architecture', '/contact']) {
      await page.goto(`${base}${lang + name || '/'}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      rows.push(
        await page.evaluate(
          ({ width, lang, name }) => {
            const nav = document.querySelector('[data-nav="main"]');
            const texts = [...nav.querySelectorAll('a')].map((a) => {
              const r = document.createRange();
              r.selectNodeContents(a);
              return r.getBoundingClientRect();
            });
            const toggle = [...document.querySelectorAll('header button')]
              .filter((b) => b.getBoundingClientRect().width > 0)
              .map((b) => b.parentElement.getBoundingClientRect());
            const card = document.querySelector('[data-fun-fact]').getBoundingClientRect();
            const brand = document.querySelector('header a').getBoundingClientRect();
            const uiBottom = Math.max(
              ...texts.map((r) => r.bottom),
              ...toggle.map((r) => r.bottom),
            );
            return {
              width,
              lang: lang || 'en',
              page: name || '/',
              linkTop: Math.round(nav.querySelector('a').getBoundingClientRect().top),
              textTop: Math.round(texts[0].top),
              textBottom: Math.round(texts[0].bottom),
              pillTop: toggle[0] ? Math.round(toggle[0].top) : null,
              pillBottom: toggle[0] ? Math.round(toggle[0].bottom) : null,
              pillLeft: toggle[0] ? Math.round(toggle[0].left) : null,
              pillRight: toggle[0] ? Math.round(toggle[0].right) : null,
              cardTop: Math.round(card.top),
              cardLeft: Math.round(card.left),
              cardRight: Math.round(card.right),
              clearAboveCard: Math.round(card.top - uiBottom),
              brandBottom: Math.round(brand.bottom),
            };
          },
          { width, lang, name },
        ),
      );
    }
  await page.close();
}
fs.writeFileSync('out/header-geometry.json', JSON.stringify(rows, null, 1));
for (const w of [800, 1024, 1280, 1920]) {
  const r = rows.filter((x) => x.width === w);
  const home = r.filter((x) => x.page === '/');
  const other = r.filter((x) => x.page !== '/');
  console.log(
    w,
    'linkTop',
    [...new Set(r.map((x) => x.linkTop))],
    'textTop',
    [...new Set(r.map((x) => x.textTop))],
    'pill',
    home[0].pillTop,
    home[0].pillBottom,
    home[0].pillLeft,
    home[0].pillRight,
    'clear Home',
    home.map((x) => x.clearAboveCard),
    'clear other',
    Math.min(...other.map((x) => x.clearAboveCard)),
    Math.max(...other.map((x) => x.clearAboveCard)),
  );
}
await browser.close();
