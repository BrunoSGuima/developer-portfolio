import { describe, expect, it } from 'vitest';
import manifest from '../../assets/illustrations/manifest.json';
import { getIllustration, type IllustrationKey } from './illustrations.ts';

const KEYS = Object.keys(manifest) as IllustrationKey[];

describe('illustration derivatives', () => {
  it('covers the displayed approved assets (A4 hero-props is kept as a source only)', () => {
    expect(KEYS.sort()).toEqual(['heroDesktop', 'heroMobile', 'mascotPeeking', 'mascotPresenting']);
  });

  it.each(KEYS)('%s: every derivative resolves to a WebP URL', (key) => {
    const image = getIllustration(key);

    expect(image.src).toMatch(/\.webp/);
    expect(image.srcSet.split(', ')).toHaveLength(manifest[key].files.length);
  });

  it.each(KEYS)('%s: derivatives keep the source aspect ratio (never stretched)', (key) => {
    const entry = manifest[key];
    for (const file of entry.files) {
      expect(file.width).toBeLessThanOrEqual(entry.width);
      expect(Math.abs(file.height - (file.width * entry.height) / entry.width)).toBeLessThanOrEqual(
        1,
      );
    }
  });

  it('crops the white strip off the mobile background (A2)', () => {
    expect(manifest.heroMobile.source).toBe('hero-background-mobile.png');
    expect(manifest.heroMobile.width).toBe(433 - 18);
    expect(manifest.heroMobile.height).toBe(829);
  });
});
