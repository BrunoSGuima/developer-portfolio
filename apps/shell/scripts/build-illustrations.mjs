/**
 * Builds the web derivatives of the approved illustrations (Step 7, Phase B).
 *
 * Reads the source PNGs in docs/assets/source/ (never modified) and writes WebP files plus a
 * manifest of their dimensions to src/assets/illustrations/. The outputs are committed, so the
 * normal build and CI never need sharp. Run after replacing a source image:
 *
 *   npm run illustrations -w apps/shell
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, '../../../docs/assets/source');
const outDir = join(here, '../src/assets/illustrations');

const OPAQUE = { quality: 82, effort: 6 };
const ALPHA = { quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true };

/** Each source → derivative widths (never wider than the source) and encoding. */
const ILLUSTRATIONS = [
  { key: 'heroDesktop', file: 'hero-background-desktop.png', widths: [1174, 800], webp: OPAQUE },
  {
    key: 'heroMobile',
    file: 'hero-background-mobile.png',
    // The delivered A2 has a white strip in its first 18 columns: crop it off.
    crop: { left: 18, top: 0 },
    widths: [415],
    webp: OPAQUE,
  },
  { key: 'mascotPresenting', file: 'mascot-presenting.png', widths: [760, 380], webp: ALPHA },
  // A4 (hero-props.png) is kept in docs/assets/source/ but no longer displayed: no derivative.
  { key: 'mascotPeeking', file: 'mascot-peeking.png', widths: [640, 320], webp: ALPHA },
];

await mkdir(outDir, { recursive: true });
const manifest = {};

for (const { key, file, crop, widths, webp } of ILLUSTRATIONS) {
  const meta = await sharp(join(sourceDir, file)).metadata();
  const region = crop
    ? {
        left: crop.left,
        top: crop.top,
        width: meta.width - crop.left,
        height: meta.height - crop.top,
      }
    : { left: 0, top: 0, width: meta.width, height: meta.height };
  manifest[key] = { source: file, width: region.width, height: region.height, files: [] };

  for (const width of widths) {
    const target = Math.min(width, region.width);
    const name = `${key}-${target}.webp`;
    const info = await sharp(join(sourceDir, file))
      .extract(region)
      .resize({ width: target, kernel: 'lanczos3', withoutEnlargement: true })
      .webp(webp)
      .toFile(join(outDir, name));
    manifest[key].files.push({ name, width: info.width, height: info.height, bytes: info.size });
    console.log(
      `${name.padEnd(28)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`,
    );
  }
}

await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('manifest.json written');
