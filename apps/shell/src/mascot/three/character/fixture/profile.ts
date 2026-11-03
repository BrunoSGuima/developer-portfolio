import type { CharacterProfile } from '../contract.ts';

/**
 * The test character (scripts/build-mascot-fixture.mjs): boxes, with nothing in common with a real
 * model. Only the flagged test build can ask for it. If behaviour code ever depended on a real
 * character, the sequence would break with this one.
 */
const fixture: CharacterProfile = {
  modelUrl: new URL('./fixture.glb', import.meta.url).href,
  metrics: {
    standingTop: 1,
    seatedTop: 0.8,
    seatedBottom: 0,
    sitBulge: 0,
    halfWidth: 0.26,
    pointReach: 0.5,
    jumpTop: 1.32,
    walkSpeed: 1,
    runSpeed: 2,
  },
  jump: { takeoff: 0.2, touchdown: 0.7, end: 0.95 },
  requiredClips: ['Rest', 'Stroll', 'Sprint', 'Leap'],
  requiredNodes: ['Frame', 'Upper', 'ShinLeft', 'ShinRight', 'LimbLeft', 'LimbRight', 'Topper'],
  accessories: { prop: { node: 'Prop', visible: false } },
  loadPoser: async () => (await import('./pose.ts')).poseFixture,
};

export const testCharacters: Readonly<Record<string, CharacterProfile>> = {
  fixture,
  /** The same, with its optional accessory showing: no motion may depend on it. */
  'fixture-with-prop': { ...fixture, accessories: { prop: { node: 'Prop', visible: true } } },
  /** Its accessory's node is missing: accessories are optional, so this still works. */
  'fixture-no-prop-node': {
    ...fixture,
    accessories: { prop: { node: 'NoSuchNode', visible: true } },
  },
  /** A profile its model can't satisfy: must fall back to 2D. */
  broken: { ...fixture, requiredClips: [...fixture.requiredClips, 'NoSuchClip'] },
  /** A model that can't be fetched: must fall back to 2D. */
  missing: { ...fixture, modelUrl: '/no-such-model.glb' },
};
