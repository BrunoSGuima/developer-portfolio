/**
 * Builds the social sharing preview (Open Graph / X card), public/og-image.jpg: 1200 × 630, the
 * site's own artwork composed into a card. Nothing is redrawn: it uses the committed derivatives
 * of the approved art (the day office painting, and the presenting mascot without its emphasis
 * marks, Step 4.6b), the site's Inter font and its colour tokens. Chromium (Playwright, already
 * installed for the E2E suite) renders the card so the woff2 font draws exactly as on the site;
 * sharp encodes the JPEG. The output is committed, so normal builds never run this. Run after
 * changing the art or the text:
 *
 *   npm run og-image -w apps/shell
 */
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const illustrations = join(here, '../src/assets/illustrations');
const output = join(here, '../public/og-image.jpg');

export const WIDTH = 1200;
export const HEIGHT = 630;

/** A local file as a data URL (the card is rendered from a string, with no server). */
function dataUrl(path, type) {
  return `data:${type};base64,${readFileSync(path).toString('base64')}`;
}

const font = dataUrl(
  require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  'font/woff2',
);
const backdrop = dataUrl(join(illustrations, 'heroDesktop-1174.webp'), 'image/webp');
const mascot = dataUrl(join(illustrations, 'mascotPresenting-760.webp'), 'image/webp');

// Colours are the light theme's tokens (src/styles/tokens.css): --color-text (charcoal-900),
// --color-text-muted's base (charcoal-700), --color-accent (burgundy-700) and the cream veil
// (--hero-scrim), here a little stronger so the text stays legible at thumbnail size.
const card = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Inter Variable';
    font-weight: 100 900;
    src: url(${font}) format('woff2');
  }
  * { margin: 0; box-sizing: border-box; }
  body {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    font-family: 'Inter Variable', sans-serif;
    color: #2a2b30;
    background: #fcf5ed;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 100%;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to right,
      rgb(252 245 237 / 0.82) 0,
      rgb(252 245 237 / 0.82) 50%,
      rgb(252 245 237 / 0) 68%
    );
  }
  .mascot {
    position: absolute;
    right: 64px;
    bottom: -8px;
    height: 600px;
  }
  .text {
    position: absolute;
    left: 72px;
    top: 50%;
    transform: translateY(-50%);
    width: 600px;
  }
  h1 {
    font-size: 76px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
  }
  .role {
    margin-top: 20px;
    font-size: 40px;
    font-weight: 500;
    line-height: 1.2;
    color: #45464d;
  }
  .url {
    margin-top: 36px;
    font-size: 26px;
    font-weight: 600;
    color: #802b2a;
  }
</style>
</head>
<body>
  <img class="backdrop" src="${backdrop}" alt="" />
  <div class="scrim"></div>
  <img class="mascot" src="${mascot}" alt="" />
  <div class="text">
    <h1>Bruno Guimarães</h1>
    <p class="role">Full Stack Software Engineer</p>
    <p class="url">bruno-guimaraes.pages.dev</p>
  </div>
</body>
</html>`;

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    await page.setContent(card, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png' });
    // A baseline (non-progressive) JPEG, the most widely supported by link-preview crawlers:
    // mozjpeg's settings without optimiseScans, which would force progressive scans.
    await sharp(png)
      .jpeg({
        quality: 82,
        progressive: false,
        trellisQuantisation: true,
        overshootDeringing: true,
        quantisationTable: 3,
      })
      .toFile(output);
  } finally {
    await browser.close();
  }
  const { width, height, format } = await sharp(output).metadata();
  console.log(
    `og-image: ${output} (${format}, ${width}×${height}, ${statSync(output).size} bytes)`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
