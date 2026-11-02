import type { Rig } from '../rig.ts';

/**
 * What the behaviour needs to know about a character. Behaviour code (the machine, motion, geometry,
 * timer and director) sees only this: never a bone or a clip name.
 *
 * All values are multiples of the character's standing height. Measure them from rendered pixels:
 * a test fails if the active character's profile is out of date.
 */
export interface CharacterMetrics {
  /** How far standing reaches above the feet. */
  standingTop: number;
  /** How far seated reaches above the feet plane. */
  seatedTop: number;
  /** How far seated reaches relative to the feet plane: negative is below it. */
  seatedBottom: number;
  /** How much lower the bent limbs reach halfway between standing and seated. */
  sitBulge: number;
  /** Half the standing width. */
  halfWidth: number;
  /** How far the pointing arm reaches from the character's centre. */
  pointReach: number;
  /** How far the jump reaches above the feet at its highest. */
  jumpTop: number;
  /** Heights per second that the walk and run cycles cover without their feet sliding. */
  walkSpeed: number;
  runSpeed: number;
}

/** Seconds into the character's jump animation. */
export interface JumpTimings {
  /** The feet leave the ground. */
  takeoff: number;
  /** The feet touch the ground. */
  touchdown: number;
  /** The landing has finished. */
  end: number;
}

/** What the character should be doing, in terms of intentions. How it does it is its own business. */
export interface PoseIntent {
  /** Seconds into the idle. */
  idleTime: number;
  /** 0 idle, 1 fully in a walk or run cycle. */
  gait: number;
  /** 0 walking, 1 running. */
  run: number;
  /** Seconds into the walk or run cycle. */
  cycle: number;
  /** 0 not jumping, 1 fully in the jump. */
  jump: number;
  /** Seconds into the jump. */
  jumpTime: number;
  /** 0 standing, 1 seated. */
  sit: number;
  /** Body turn in radians: 0 faces the viewer, positive turns towards larger x. */
  yaw: number;
  /** 0 arm down, 1 pointing down and across, towards the card's content. */
  point: number;
  /** The pointing arm. L is the viewer's right, R the viewer's left. Both must always be free. */
  arm: 'L' | 'R';
}

/** Applies an intent to the rig: with clips, bones, or both. */
export type Poser = (rig: Rig, intent: PoseIntent) => void;

/** An optional extra, such as the laptop: a named node that can be shown or left out. */
export interface Accessory {
  node: string;
  visible: boolean;
}

export interface CharacterProfile {
  modelUrl: string;
  metrics: CharacterMetrics;
  jump: JumpTimings;
  /** Loading fails safely to 2D if any of these is missing from the model. */
  requiredClips: readonly string[];
  requiredNodes: readonly string[];
  /** Never required: no motion may depend on one. */
  accessories?: Readonly<Record<string, Accessory>>;
  /** Loaded with the engine: it needs `three`, which the profile itself doesn't. */
  loadPoser: () => Promise<Poser>;
}
