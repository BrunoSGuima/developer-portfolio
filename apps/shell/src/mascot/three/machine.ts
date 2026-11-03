import type { CardLanding } from './landing.ts';

/** Where the character is in its trip. Everything else is continuous (motion.ts). */
export type NavPhase =
  'seated' | 'standing' | 'walking' | 'sitting' | 'jumping' | 'pointing' | 'perched';

export interface NavState {
  phase: NavPhase;
  /** The active link's x, in document pixels: where any trip on the nav ends. */
  targetX: number;
  /** Where the current trip is heading. */
  goal: 'nav' | 'card';
  /** Where to land on the Fun Fact card, while that is the goal. */
  landing: CardLanding | null;
  /** Id of the latest phase; a completion reported for an older one is ignored. */
  token: number;
}

export type NavEvent =
  /** First placement, or the layout moved while seated: be seated at `x`, never walk. */
  | { type: 'PLACE'; x: number }
  /** The active section changed. Only the latest target is kept: there is no queue. */
  | { type: 'NAVIGATE'; x: number; reducedMotion: boolean }
  /** The layout moved during a trip: keep going, to where the active link is now. */
  | { type: 'RETARGET'; x: number }
  /** The timer ended. Only a seated character obeys, so a stale timer can't start anything. */
  | { type: 'JUMP_TO_CARD'; landing: CardLanding }
  /** The layout moved while heading for or on the card; null when it no longer has room. */
  | { type: 'MOVE_LANDING'; landing: CardLanding | null }
  /** The current phase finished. */
  | { type: 'PHASE_DONE'; token: number };

export const initialNavState: NavState = {
  phase: 'seated',
  targetX: 0,
  goal: 'nav',
  landing: null,
  token: 0,
};

/** Leaves for the nav from wherever the character is, keeping a flight in the air. */
function headForNav(state: NavState): NavState {
  const base = { ...state, goal: 'nav' as const, landing: null };
  switch (state.phase) {
    case 'standing':
      return base; // not yet off the nav: it just walks instead
    case 'jumping':
    case 'pointing':
    case 'perched':
      return { ...base, phase: 'jumping', token: state.token + 1 };
    default:
      return state;
  }
}

export function navReducer(state: NavState, event: NavEvent): NavState {
  switch (event.type) {
    case 'PLACE':
      return {
        phase: 'seated',
        targetX: event.x,
        goal: 'nav',
        landing: null,
        token: state.token + 1,
      };

    case 'NAVIGATE': {
      if (event.reducedMotion) {
        return {
          phase: 'seated',
          targetX: event.x,
          goal: 'nav',
          landing: null,
          token: state.token + 1,
        };
      }
      const next = { ...state, targetX: event.x };
      if (state.goal === 'card') return headForNav(next);
      // Already on the way up, in the air or walking: same phase, new destination. From a seat, or
      // while sitting down, stand (again) first.
      if (state.phase === 'seated' || state.phase === 'sitting') {
        return { ...next, phase: 'standing', token: state.token + 1 };
      }
      return next;
    }

    case 'RETARGET':
      return { ...state, targetX: event.x };

    case 'JUMP_TO_CARD':
      if (state.phase !== 'seated') return state;
      return {
        ...state,
        phase: 'standing',
        goal: 'card',
        landing: event.landing,
        token: state.token + 1,
      };

    case 'MOVE_LANDING':
      if (state.goal !== 'card') return state;
      return event.landing ? { ...state, landing: event.landing } : headForNav(state);

    case 'PHASE_DONE':
      if (event.token !== state.token) return state;
      switch (state.phase) {
        case 'standing':
          return {
            ...state,
            phase: state.goal === 'card' ? 'jumping' : 'walking',
            token: state.token + 1,
          };
        case 'jumping':
          return {
            ...state,
            phase: state.goal === 'card' ? 'pointing' : 'walking',
            token: state.token + 1,
          };
        case 'pointing':
          return { ...state, phase: 'perched', token: state.token + 1 };
        case 'walking':
          return { ...state, phase: 'sitting', token: state.token + 1 };
        case 'sitting':
          return { ...state, phase: 'seated', token: state.token + 1 };
        case 'seated':
        case 'perched':
          return state;
      }
  }
}
