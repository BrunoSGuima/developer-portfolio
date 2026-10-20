import { walkDuration } from './geometry.ts';

/** Poses the mascot can take. Extend with new art (e.g. 'waving') in assets.tsx. */
export type MascotPose = 'idle' | 'walking' | 'pointing';
export type Facing = 'left' | 'right';

export interface MascotState {
  pose: MascotPose;
  /** Target offset in the lane (px). */
  x: number;
  facing: Facing;
  /** Direction to face when pointing at the Fun Fact. */
  pointFacing: Facing;
  /** Id of the latest move; events for older moves are ignored. */
  move: number;
  /** Duration of the current walk (ms). */
  walkMs: number;
}

export type MascotEvent =
  /** First placement or resize: jump to `x`, never walk. */
  | { type: 'PLACE'; x: number }
  /** The active section changed: walk (or, with reduced motion, jump) to `x`. */
  | { type: 'NAVIGATE'; fromX: number; x: number; pointFacing: Facing; reducedMotion: boolean }
  /** The walk for `move` finished (transitionend or fallback timer). */
  | { type: 'ARRIVED'; move: number }
  /** Pointing for `move` is over. */
  | { type: 'REST'; move: number };

export function initialMascotState(facing: Facing = 'right'): MascotState {
  return { pose: 'idle', x: 0, facing, pointFacing: facing, move: 0, walkMs: 0 };
}

export function mascotReducer(state: MascotState, event: MascotEvent): MascotState {
  switch (event.type) {
    case 'PLACE':
      return event.x === state.x ? state : { ...state, x: event.x };

    case 'NAVIGATE': {
      const next = { ...state, move: state.move + 1, x: event.x, pointFacing: event.pointFacing };
      if (event.reducedMotion || event.x === event.fromX) {
        return { ...next, pose: 'pointing', facing: event.pointFacing, walkMs: 0 };
      }
      return {
        ...next,
        pose: 'walking',
        facing: event.x > event.fromX ? 'right' : 'left',
        walkMs: walkDuration(event.fromX, event.x),
      };
    }

    case 'ARRIVED':
      if (event.move !== state.move || state.pose !== 'walking') return state;
      return { ...state, pose: 'pointing', facing: state.pointFacing };

    case 'REST':
      if (event.move !== state.move || state.pose !== 'pointing') return state;
      return { ...state, pose: 'idle' };
  }
}
