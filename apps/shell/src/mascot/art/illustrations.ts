import manifest from '../../assets/illustrations/manifest.json';

/**
 * The approved raster illustrations (docs/assets/source/, see docs/assets/ART-BRIEF.md), as web
 * derivatives built by `npm run illustrations`. Dimensions come from the generated manifest; URLs
 * are resolved by Vite (content-hashed in production).
 */

export type IllustrationKey = keyof typeof manifest;

export interface Illustration {
  /** Intrinsic size of the largest derivative (for width/height attributes and aspect ratio). */
  width: number;
  height: number;
  src: string;
  srcSet: string;
}

const urls = import.meta.glob<string>('../../assets/illustrations/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

export function getIllustration(key: IllustrationKey): Illustration {
  const files = manifest[key].files.map((file) => {
    const url = urls[`../../assets/illustrations/${file.name}`];
    if (!url) throw new Error(`Missing illustration derivative: ${file.name}`);
    return { ...file, url };
  });
  const largest = files.reduce((a, b) => (b.width > a.width ? b : a));
  return {
    width: largest.width,
    height: largest.height,
    src: largest.url,
    srcSet: files.map((file) => `${file.url} ${file.width}w`).join(', '),
  };
}

/**
 * A5 (mascot-peeking): the hands rest on a straight line at y = 918 of the 978 px source.
 * Everything above it shows over the Fun Fact card; only the fingertips hang below it.
 */
export const PEEKING_LEDGE = 918 / 978;
