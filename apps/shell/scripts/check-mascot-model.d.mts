export interface ModelFile {
  size: number;
  gltf: object;
}

export const SIZE_TARGETS: { bytes: number; triangles: number; bones: number };

export function readGlb(file: string): ModelFile;

export function checkModel(
  model: ModelFile,
  requiredClips?: readonly string[],
): {
  problems: string[];
  warnings: string[];
  facts: { size: number; triangles: number; bones: number; clips: string[] };
};
