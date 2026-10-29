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

export const OPAQUE = { quality: 82, effort: 6 };
export const ALPHA = { quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true };

/**
 * Each source → derivative widths (never wider than the source) and encoding. `matches` makes
 * every derivative exactly the size of that illustration's derivative of the same width, so a
 * night backdrop and its day counterpart are interchangeable (ADR-0017).
 */
export const ILLUSTRATIONS = [
  { key: 'heroDesktop', file: 'hero-background-desktop.png', widths: [1174, 800], webp: OPAQUE },
  {
    key: 'heroMobile',
    file: 'hero-background-mobile.png',
    // The delivered A2 has a white strip in its first 18 columns: crop it off.
    crop: { left: 18, top: 0 },
    widths: [415],
    webp: OPAQUE,
  },
  // The night backdrops (Step 4.6b, approved by the owner as delivered, 2026-10-28): the same
  // office at night, at a higher resolution and not pixel-aligned with A1/A2 (the backdrop
  // crossfades on a theme switch). Scaled to the day sizes; never cropped.
  {
    key: 'heroDesktopNight',
    file: 'hero-background-desktop-night.png',
    matches: 'heroDesktop',
    widths: [1174, 800],
    webp: OPAQUE,
  },
  {
    key: 'heroMobileNight',
    file: 'hero-background-mobile-night.png',
    matches: 'heroMobile',
    widths: [415],
    webp: OPAQUE,
  },
  {
    key: 'mascotPresenting',
    file: 'mascot-presenting.png',
    // The three orange emphasis marks beside the pointing finger are removed (owner's decision,
    // Step 4.6b); the approved source stays byte-identical. See removeEmphasisMarks().
    removeMarks: true,
    widths: [760, 380],
    webp: ALPHA,
  },
  // A4 (hero-props.png) is kept in docs/assets/source/ but no longer displayed: no derivative.
  { key: 'mascotPeeking', file: 'mascot-peeking.png', widths: [640, 320], webp: ALPHA },
];

/**
 * The emphasis marks in A3 (mascot-presenting.png): three small orange strokes beside the
 * pointing finger, each a separate opaque island (not touching the mascot, 31 px away or more).
 * Exported for the tests, which check the committed derivatives against the same rule.
 */
export const EMPHASIS_MARKS = {
  count: 3,
  maxPixels: 3000,
  // Where they are (source pixels), with margin: right of the finger, around its height.
  region: { minX: 960, maxX: 1120, minY: 290, maxY: 470 },
};

const isOrange = (r, g, b) => r > 200 && g > 120 && g < 200 && b < 60;

/** The opaque islands of an RGBA image (8-connected), largest first, as pixel-index lists. */
export function opaqueComponents(data, width, height) {
  const label = new Int32Array(width * height);
  const components = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] || data[start * 4 + 3] === 0) continue;
    const id = components.length + 1;
    const pixels = [];
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const x = p % width;
      for (const dy of [-1, 0, 1]) {
        for (const dx of [-1, 0, 1]) {
          const nx = x + dx;
          const n = p + dy * width + dx;
          if ((dx || dy) && nx >= 0 && nx < width && n >= 0 && n < width * height) {
            if (!label[n] && data[n * 4 + 3] > 0) {
              label[n] = id;
              stack.push(n);
            }
          }
        }
      }
    }
    components.push(pixels);
  }
  return components.sort((a, b) => b.length - a.length);
}

/**
 * Makes the three emphasis marks transparent and leaves every other pixel untouched. Refuses
 * (throws) unless the image is exactly one large mascot plus three small, orange islands in the
 * expected place, so a changed source can never lose anything else.
 */
export function removeEmphasisMarks(data, width, height) {
  const [mascot, ...marks] = opaqueComponents(data, width, height);
  const { count, maxPixels, region } = EMPHASIS_MARKS;
  const problems = [];
  if (marks.length !== count) problems.push(`${marks.length} detached islands, expected ${count}`);
  for (const pixels of marks) {
    let orange = 0;
    for (const p of pixels) {
      const x = p % width;
      const y = (p - x) / width;
      if (x < region.minX || x > region.maxX || y < region.minY || y > region.maxY) {
        problems.push(`an island pixel at ${x},${y} is outside the marks' region`);
        break;
      }
      if (isOrange(data[p * 4], data[p * 4 + 1], data[p * 4 + 2])) orange++;
    }
    if (pixels.length > maxPixels) problems.push(`an island of ${pixels.length} px is too large`);
    if (orange < pixels.length * 0.8) problems.push('an island is not mostly orange');
  }
  if (!mascot || mascot.length < 100 * maxPixels) problems.push('no mascot component found');
  if (problems.length > 0) {
    throw new Error(
      `mascot-presenting.png: emphasis marks not as expected: ${problems.join('; ')}`,
    );
  }

  const cleaned = Buffer.from(data);
  for (const pixels of marks) for (const p of pixels) cleaned.fill(0, p * 4, p * 4 + 4);
  return { cleaned, removed: marks.map((pixels) => pixels.length) };
}

/** The source as sharp input: the PNG itself, or its pixels with the emphasis marks removed. */
async function sourceImage(file, removeMarks) {
  const path = join(sourceDir, file);
  if (!removeMarks) return () => sharp(path);
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { cleaned, removed } = removeEmphasisMarks(data, info.width, info.height);
  console.log(`${file}: removed the emphasis marks (${removed.join(', ')} px)`);
  const raw = { width: info.width, height: info.height, channels: 4 };
  return () => sharp(cleaned, { raw });
}

/** The most a `matches` derivative may be stretched to fit its counterpart's exact size. */
export const MAX_DISTORTION = 0.005;

/**
 * The derivatives of one illustration, as encoded WebP buffers with their names and sizes. Shared
 * by the build and the tests (which re-derive a file to check the pipeline is reproducible).
 * `sizes` gives the exact size of each derivative of the illustration it `matches`.
 */
export async function derivatives({ key, file, crop, removeMarks, matches, widths, webp }, sizes) {
  const input = await sourceImage(file, removeMarks);
  const meta = await input().metadata();
  const region = crop
    ? {
        left: crop.left,
        top: crop.top,
        width: meta.width - crop.left,
        height: meta.height - crop.top,
      }
    : { left: 0, top: 0, width: meta.width, height: meta.height };

  const files = [];
  for (const width of widths) {
    const target = Math.min(width, region.width);
    let resize = { width: target, kernel: 'lanczos3', withoutEnlargement: true };
    if (matches) {
      const size = sizes?.[`${matches}-${width}`];
      if (!size) throw new Error(`${key}: ${matches} has no ${width}px derivative to match`);
      const distortion = Math.abs(size.width / region.width / (size.height / region.height) - 1);
      if (distortion > MAX_DISTORTION) {
        throw new Error(`${key}: matching ${matches} would distort it by ${distortion}`);
      }
      resize = { width: size.width, height: size.height, fit: 'fill', kernel: 'lanczos3' };
    }
    const { data, info } = await input()
      .extract(region)
      .resize(resize)
      .webp(webp)
      .toBuffer({ resolveWithObject: true });
    files.push({ name: `${key}-${info.width}.webp`, data, width: info.width, height: info.height });
  }
  return { source: file, width: region.width, height: region.height, files };
}

async function build() {
  await mkdir(outDir, { recursive: true });
  const manifest = {};
  const sizes = {};

  for (const illustration of ILLUSTRATIONS) {
    const { key } = illustration;
    const { source, width, height, files } = await derivatives(illustration, sizes);
    manifest[key] = { source, width, height, files: [] };

    for (const [index, file] of files.entries()) {
      const { name, data } = file;
      const info = { width: file.width, height: file.height, size: data.length };
      await writeFile(join(outDir, name), data);
      sizes[`${key}-${illustration.widths[index]}`] = info;
      manifest[key].files.push({ name, width: info.width, height: info.height, bytes: info.size });
      console.log(
        `${name.padEnd(28)} ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`,
      );
    }
  }

  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('manifest.json written');
}

// Builds only when run as a script; the tests import the functions above.
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
