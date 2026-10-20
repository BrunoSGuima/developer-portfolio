/**
 * Builds the favicons from the approved mascot art (A3, docs/assets/source/mascot-presenting.png,
 * never modified): a square crop of the head, scaled down onto a cream rounded square (the
 * site's surface colour) so it stays legible on light and dark browser tabs. Nothing is redrawn.
 * The outputs are committed to public/, so normal builds never need sharp. Run after replacing
 * the source image:
 *
 *   npm run favicon -w apps/shell
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '../../../docs/assets/source/mascot-presenting.png');
const outDir = join(here, '../public');

/** The head (hair to chin) in the 1154×1363 source, as a square. */
export const HEAD = { left: 205, top: 25, width: 630, height: 630 };
/** --color-cream-50 (the site's surface colour). */
const BACKGROUND = { r: 252, g: 245, b: 237, alpha: 1 };
/** Each icon: its size and how much of it the head fills (the rest is the cream margin). */
const ICONS = [
  { file: 'favicon-16.png', size: 16, fill: 1 },
  { file: 'favicon-32.png', size: 32, fill: 0.94 },
  { file: 'apple-touch-icon.png', size: 180, fill: 0.86 },
];

/** The head on a cream rounded square, as a PNG buffer. */
export async function renderIcon(size, fill) {
  const inner = Math.round(size * fill);
  const head = await sharp(source)
    .extract(HEAD)
    .resize(inner, inner, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const radius = Math.round(size * 0.22);
  const tile = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="rgb(${BACKGROUND.r},${BACKGROUND.g},${BACKGROUND.b})"/></svg>`,
  );
  const offset = Math.round((size - inner) / 2);
  return sharp(tile)
    .composite([{ input: head, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const { file, size, fill } of ICONS) {
    const info = await sharp(await renderIcon(size, fill)).toFile(join(outDir, file));
    console.log(`${file.padEnd(22)} ${info.width}×${info.height}  ${info.size} B`);
  }
}
