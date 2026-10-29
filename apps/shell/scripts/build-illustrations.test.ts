// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import manifest from '../src/assets/illustrations/manifest.json' with { type: 'json' };
import {
  ALPHA,
  derivatives,
  EMPHASIS_MARKS,
  ILLUSTRATIONS,
  MAX_DISTORTION,
  opaqueComponents,
  removeEmphasisMarks,
} from './build-illustrations.mjs';

// The three orange emphasis marks beside the mascot's pointing finger are removed from the web
// derivatives (owner's decision, Step 4.6b); the approved source PNG is never modified.

const source = fileURLToPath(
  new URL('../../../docs/assets/source/mascot-presenting.png', import.meta.url),
);
const derivative = (name: string) =>
  fileURLToPath(new URL(`../src/assets/illustrations/${name}`, import.meta.url));

interface Raw {
  data: Buffer;
  width: number;
  height: number;
}

async function raw(input: string | Buffer): Promise<Raw> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

let original: Raw;

beforeAll(async () => {
  original = await raw(source);
});

describe('the approved source (A3, mascot-presenting.png)', () => {
  it('is unchanged: one mascot plus the three detached marks', () => {
    // Recorded on 2026-10-28 (Step 4.6b): the marks are removed from the derivatives only.
    expect(createHash('sha256').update(readFileSync(source)).digest('hex').slice(0, 16)).toBe(
      'a410672233e038c9',
    );
    const [mascot, ...marks] = opaqueComponents(original.data, original.width, original.height);
    expect(marks.map((pixels) => pixels.length)).toEqual([2217, 1972, 1799]);
    expect(mascot!.length).toBe(603335);
  });
});

describe('removeEmphasisMarks', () => {
  it('makes exactly the three marks transparent and leaves every other pixel identical', () => {
    const { data, width, height } = original;
    const { cleaned, removed } = removeEmphasisMarks(data, width, height);

    expect(removed).toEqual([2217, 1972, 1799]);
    const marks = new Set(opaqueComponents(data, width, height).slice(1).flat());
    let changed = 0;
    for (let p = 0; p < width * height; p++) {
      const same = data.compare(cleaned, p * 4, p * 4 + 4, p * 4, p * 4 + 4) === 0;
      if (marks.has(p)) expect(cleaned.readUInt32BE(p * 4)).toBe(0);
      else if (!same) changed++;
    }
    expect(changed).toBe(0);
    expect(opaqueComponents(cleaned, width, height)).toHaveLength(1);
  });

  it('refuses an unexpected extra island (the source changed)', () => {
    const { data, width, height } = original;
    const altered = Buffer.from(data);
    altered.fill(255, (10 * width + 10) * 4, (10 * width + 10) * 4 + 4); // a stray pixel at 10,10
    expect(() => removeEmphasisMarks(altered, width, height)).toThrow(/4 detached islands/);
  });

  it('refuses islands that are not orange or not where the marks are', () => {
    const { data, width, height } = original;
    const [, firstMark] = opaqueComponents(data, width, height);
    const recoloured = Buffer.from(data);
    for (const p of firstMark!) recoloured.fill(40, p * 4, p * 4 + 3); // dark grey
    expect(() => removeEmphasisMarks(recoloured, width, height)).toThrow(/not mostly orange/);

    const moved = Buffer.from(data);
    for (const p of firstMark!) moved.fill(0, p * 4, p * 4 + 4);
    const island = (60 * width + 60) * 4; // a small orange island far from the finger
    for (let i = 0; i < 4; i++) moved.writeUInt32BE(0xfaa709ff, island + i * 4);
    expect(() => removeEmphasisMarks(moved, width, height)).toThrow(/outside the marks' region/);
  });
});

describe.each(manifest.mascotPresenting.files)(
  'the derivative $name',
  ({ name, width, height }) => {
    const scale = width / manifest.mascotPresenting.width;
    const { region } = EMPHASIS_MARKS;
    // The marks' area in derivative pixels, plus one 16 px WebP macroblock.
    const box = {
      x0: Math.floor(region.minX * scale) - 16,
      x1: Math.ceil(region.maxX * scale) + 16,
      y0: Math.floor(region.minY * scale) - 16,
      y1: Math.ceil(region.maxY * scale) + 16,
    };
    const inBox = (x: number, y: number) =>
      x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
    // Right of the finger (source x 1016), where only the marks were drawn.
    const beyondFinger = (x: number, y: number) => x > Math.ceil(1016 * scale) && inBox(x, y);

    let before: Raw;
    let after: Raw;

    beforeAll(async () => {
      // What the build made before the change: the same pipeline from the untouched source.
      before = await raw(
        await sharp(source)
          .resize({ width, kernel: 'lanczos3', withoutEnlargement: true })
          .webp(ALPHA)
          .toBuffer(),
      );
      after = await raw(derivative(name));
    }, 60_000);

    /** Visible islands (alpha above 8: resizing leaves invisible 1–4 alpha specks at the edges). */
    const visibleIslands = (image: Raw) =>
      opaqueComponents(image.data, image.width, image.height).filter((pixels) =>
        pixels.some((p) => image.data[p * 4 + 3]! > 8),
      );

    it('keeps the canvas size (so the stage geometry is unchanged)', () => {
      expect([after.width, after.height]).toEqual([width, height]);
    });

    it('shows the mascot alone, unchanged in extent; the three marks are gone', () => {
      const [mascotBefore, ...marksBefore] = visibleIslands(before);
      const [mascotAfter, ...othersAfter] = visibleIslands(after);

      expect(marksBefore).toHaveLength(3);
      expect(othersAfter).toHaveLength(0);
      expect(mascotAfter!.length).toBe(mascotBefore!.length);
      for (let y = box.y0; y <= box.y1; y++) {
        for (let x = box.x0; x <= box.x1; x++) {
          if (beyondFinger(x, y))
            expect(after.data[(y * width + x) * 4 + 3]).toBeLessThanOrEqual(8);
        }
      }
    });

    it('differs from the marked version only within WebP encoding tolerance outside the marks', () => {
      // Lossy WebP re-encodes the whole image, so small changes are expected everywhere (the
      // encoder's own error against an exact resize reaches about 110 here).
      let sum = 0;
      let count = 0;
      let max = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (inBox(x, y)) continue;
          const i = (y * width + x) * 4;
          if (before.data[i + 3] === 0 && after.data[i + 3] === 0) continue;
          let diff = 0;
          for (let c = 0; c < 4; c++) {
            diff = Math.max(diff, Math.abs(before.data[i + c]! - after.data[i + c]!));
          }
          sum += diff;
          count++;
          max = Math.max(max, diff);
        }
      }
      expect(sum / count).toBeLessThan(3);
      expect(max).toBeLessThanOrEqual(24);
    });
  },
);

// The day and night backdrops (Step 4.6b, ADR-0017): the pipeline is deterministic, so rebuilding
// from the sources gives exactly the committed files, and the night derivatives take the day sizes.
describe.each(['heroDesktop', 'heroMobile', 'heroDesktopNight', 'heroMobileNight'])(
  'the backdrop %s',
  (key) => {
    it('rebuilds byte for byte from its source (reproducible pipeline)', async () => {
      const illustration = ILLUSTRATIONS.find((item) => item.key === key)!;
      const sizes: Record<string, { width: number; height: number }> = {};
      if (illustration.matches) {
        const counterpart = ILLUSTRATIONS.find((item) => item.key === illustration.matches)!;
        for (const [index, file] of (await derivatives(counterpart)).files.entries()) {
          sizes[`${counterpart.key}-${counterpart.widths[index]}`] = file;
        }
      }

      const { files } = await derivatives(illustration, sizes);

      const committed = manifest[key as keyof typeof manifest].files;
      expect(files.map(({ name, width, height }) => ({ name, width, height }))).toEqual(
        committed.map(({ name, width, height }) => ({ name, width, height })),
      );
      for (const file of files)
        expect(file.data.equals(readFileSync(derivative(file.name)))).toBe(true);
    }, 60_000);
  },
);

describe('the night backdrops', () => {
  it('are approved sources next to the day ones, scaled with at most 0.5% distortion, never cropped', async () => {
    for (const [night, day] of [
      ['hero-background-desktop-night.png', 'heroDesktop'],
      ['hero-background-mobile-night.png', 'heroMobile'],
    ] as const) {
      const path = fileURLToPath(new URL(`../../../docs/assets/source/${night}`, import.meta.url));
      const meta = await sharp(path).metadata();
      const target = manifest[day].files[0]!;
      const distortion = Math.abs(target.width / meta.width / (target.height / meta.height) - 1);
      expect(distortion, night).toBeLessThanOrEqual(MAX_DISTORTION);
      const item = ILLUSTRATIONS.find((illustration) => illustration.file === night)!;
      expect(item.crop, night).toBeUndefined();
      expect(item.matches).toBe(day);
    }
  });
});
