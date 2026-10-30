// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

/**
 * The social sharing preview (Open Graph and X cards) lives in index.html itself, so link-preview
 * crawlers, which don't run JavaScript, find it in the initial HTML. One site-wide card, with
 * absolute production URLs; the image is built by scripts/build-og-image.mjs.
 */
const ORIGIN = 'https://bruno-guimaraes.pages.dev';
const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
const imagePath = fileURLToPath(new URL('../../public/og-image.jpg', import.meta.url));

/** Every value given for a `property` (Open Graph) or `name` (X) meta tag. */
function meta(key: string): string[] {
  const pattern = new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"\\s*/>`, 'g');
  return [...html.matchAll(pattern)].map(([, content]) => content!);
}

const TITLE = 'Bruno Guimarães | Full Stack Software Engineer';
const DESCRIPTION =
  'Explore my software engineering portfolio, projects, architecture, and approach to AI-assisted development.';

describe('social sharing metadata (index.html)', () => {
  it.each([
    ['og:type', 'website'],
    ['og:site_name', 'Bruno Guimarães'],
    ['og:title', TITLE],
    ['og:description', DESCRIPTION],
    ['og:url', `${ORIGIN}/`],
    ['og:image', `${ORIGIN}/og-image.jpg`],
    ['og:image:type', 'image/jpeg'],
    ['og:image:width', '1200'],
    ['og:image:height', '630'],
    ['og:locale', 'en_US'],
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', TITLE],
    ['twitter:description', DESCRIPTION],
    ['twitter:image', `${ORIGIN}/og-image.jpg`],
  ])('has %s exactly once', (key, value) => {
    expect(meta(key)).toEqual([value]);
  });

  it('describes the image for people who can’t see it, the same on both cards', () => {
    const [alt] = meta('og:image:alt');
    expect(alt).toMatch(/^Bruno Guimarães, Full Stack Software Engineer: .*mascot/);
    expect(meta('twitter:image:alt')).toEqual([alt]);
  });

  it('uses absolute https URLs on the production origin only', () => {
    for (const key of ['og:url', 'og:image', 'twitter:image']) {
      expect(new URL(meta(key)[0]!).origin, key).toBe(ORIGIN);
    }
  });

  // LinkedIn's Post Inspector found none of the tags when long ones wrapped across lines (it fell
  // back to <title>): every tag stays on one line (.prettierrc.json gives index.html a wide
  // printWidth for this).
  it('keeps every meta tag on a single line', () => {
    const tags = html.match(/<meta\b[^>]*>/g) ?? [];

    expect(tags.length).toBeGreaterThan(16);
    for (const tag of tags) expect(tag, tag).not.toMatch(/\n/);
  });

  it('adds no inline script or style (the Content Security Policy allows none)', () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/<style\b|\sstyle="/);
  });
});

describe('the preview image (public/og-image.jpg)', () => {
  it('is a baseline 1200 × 630 JPEG, as declared, well under the platforms’ size limits', async () => {
    const { format, width, height, isProgressive } = await sharp(imagePath).metadata();

    expect({ format, width, height }).toEqual({ format: 'jpeg', width: 1200, height: 630 });
    // Baseline (not progressive): the format every link-preview crawler reads.
    expect(isProgressive).toBe(false);
    expect(String(width)).toBe(meta('og:image:width')[0]);
    expect(String(height)).toBe(meta('og:image:height')[0]);
    // LinkedIn allows 5 MB; a small file loads quickly in every preview.
    expect(statSync(imagePath).size).toBeLessThan(1024 * 1024);
  });
});
