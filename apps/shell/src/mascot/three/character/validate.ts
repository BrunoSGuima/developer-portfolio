import type { CharacterProfile } from './contract.ts';

interface ModelContents {
  clipNames: readonly string[];
  nodeNames: readonly string[];
}

/** What the profile needs and the model lacks. Accessories are optional, so never listed. */
export function missingFromModel(
  { requiredClips, requiredNodes }: Pick<CharacterProfile, 'requiredClips' | 'requiredNodes'>,
  { clipNames, nodeNames }: ModelContents,
): string[] {
  return [
    ...requiredClips.filter((name) => !clipNames.includes(name)).map((name) => `clip ${name}`),
    ...requiredNodes.filter((name) => !nodeNames.includes(name)).map((name) => `node ${name}`),
  ];
}
