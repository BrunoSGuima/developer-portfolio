// Types for the functions build-illustrations.mjs exports to its tests.
export declare const ALPHA: {
  quality: number;
  alphaQuality: number;
  effort: number;
  smartSubsample: boolean;
};

export declare const EMPHASIS_MARKS: {
  count: number;
  maxPixels: number;
  region: { minX: number; maxX: number; minY: number; maxY: number };
};

/** The opaque islands of an RGBA image (8-connected), largest first, as pixel-index lists. */
export declare function opaqueComponents(data: Buffer, width: number, height: number): number[][];

/** The image with the three emphasis marks made transparent; throws unless exactly those. */
export declare function removeEmphasisMarks(
  data: Buffer,
  width: number,
  height: number,
): { cleaned: Buffer; removed: number[] };

export interface IllustrationSource {
  key: string;
  file: string;
  crop?: { left: number; top: number };
  removeMarks?: boolean;
  /** Every derivative takes the exact size of this illustration's derivative of the same width. */
  matches?: string;
  widths: number[];
  webp: Record<string, number | boolean>;
}

export declare const ILLUSTRATIONS: IllustrationSource[];
export declare const OPAQUE: { quality: number; effort: number };
export declare const MAX_DISTORTION: number;

/** One illustration's derivatives, encoded (shared by the build and the tests). */
export declare function derivatives(
  illustration: IllustrationSource,
  sizes?: Record<string, { width: number; height: number }>,
): Promise<{
  source: string;
  width: number;
  height: number;
  files: { name: string; data: Buffer; width: number; height: number }[];
}>;
