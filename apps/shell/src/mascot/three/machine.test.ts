import { describe, expect, it } from 'vitest';
import type { CardLanding } from './landing.ts';
import { initialNavState, navReducer, type NavPhase, type NavState } from './machine.ts';

const LANDING: CardLanding = { x: 900, y: 274, side: 'R' };

const at = (
  phase: NavPhase,
  targetX = 100,
  token = 5,
  goal: NavState['goal'] = 'nav',
): NavState => ({
  phase,
  targetX,
  token,
  goal,
  landing: goal === 'card' ? LANDING : null,
});

const finish = (state: NavState) => navReducer(state, { type: 'PHASE_DONE', token: state.token });

describe('navReducer', () => {
  it('walks a full trip: stand, walk, sit, seated', () => {
    let state = navReducer(at('seated'), { type: 'NAVIGATE', x: 300, reducedMotion: false });
    const seen: NavPhase[] = [state.phase];
    for (let i = 0; i < 3; i += 1) {
      state = navReducer(state, { type: 'PHASE_DONE', token: state.token });
      seen.push(state.phase);
    }
    expect(seen).toEqual(['standing', 'walking', 'sitting', 'seated']);
    expect(state.targetX).toBe(300);
  });

  it('stays seated when a seated phase is reported done', () => {
    const state = at('seated');
    expect(navReducer(state, { type: 'PHASE_DONE', token: state.token })).toBe(state);
  });

  it.each<NavPhase>(['standing', 'walking', 'sitting', 'jumping', 'pointing'])(
    'ignores a stale completion while %s',
    (phase) => {
      const state = at(phase);
      expect(navReducer(state, { type: 'PHASE_DONE', token: state.token - 1 })).toBe(state);
    },
  );

  it.each<[NavPhase, NavPhase]>([
    ['seated', 'standing'],
    ['standing', 'standing'],
    ['walking', 'walking'],
    ['sitting', 'standing'],
  ])('navigating while %s continues as %s, heading for the new target', (from, to) => {
    const next = navReducer(at(from), { type: 'NAVIGATE', x: 700, reducedMotion: false });
    expect(next.phase).toBe(to);
    expect(next.targetX).toBe(700);
  });

  it('keeps only the latest target during rapid navigation', () => {
    let state = initialNavState;
    for (const x of [100, 200, 300, 400]) {
      state = navReducer(state, { type: 'NAVIGATE', x, reducedMotion: false });
    }
    expect(state).toMatchObject({ phase: 'standing', targetX: 400 });
  });

  it.each<NavPhase>(['seated', 'standing', 'walking', 'sitting'])(
    'with reduced motion, navigating while %s is seated at the target at once',
    (from) => {
      const next = navReducer(at(from), { type: 'NAVIGATE', x: 700, reducedMotion: true });
      expect(next).toMatchObject({ phase: 'seated', targetX: 700 });
    },
  );

  it('re-targets without changing phase or token when the layout moves mid-trip', () => {
    const state = at('walking');
    expect(navReducer(state, { type: 'RETARGET', x: 640 })).toEqual({ ...state, targetX: 640 });
  });

  it('placing invalidates any phase in flight', () => {
    const state = at('walking');
    const placed = navReducer(state, { type: 'PLACE', x: 50 });
    expect(placed).toMatchObject({ phase: 'seated', targetX: 50 });
    expect(navReducer(placed, { type: 'PHASE_DONE', token: state.token })).toBe(placed);
  });

  describe('the jump to the card', () => {
    it('goes stand, jump, point, perched, and stays', () => {
      let state = navReducer(at('seated'), { type: 'JUMP_TO_CARD', landing: LANDING });
      expect(state).toMatchObject({ phase: 'standing', goal: 'card', landing: LANDING });
      const seen: NavPhase[] = [];
      for (let i = 0; i < 3; i += 1) {
        state = finish(state);
        seen.push(state.phase);
      }
      expect(seen).toEqual(['jumping', 'pointing', 'perched']);
      expect(finish(state)).toBe(state);
    });

    it.each<NavPhase>(['standing', 'walking', 'sitting', 'jumping', 'pointing', 'perched'])(
      'a stale timer is ignored while %s',
      (phase) => {
        const state = at(phase);
        expect(navReducer(state, { type: 'JUMP_TO_CARD', landing: LANDING })).toBe(state);
      },
    );

    it('keeps the active link as its target, for the way back', () => {
      const state = navReducer(at('seated', 300), { type: 'JUMP_TO_CARD', landing: LANDING });
      expect(state.targetX).toBe(300);
    });
  });

  describe('navigating during the jump', () => {
    it('before leaving the nav, cancels it and just walks', () => {
      const next = navReducer(at('standing', 100, 5, 'card'), {
        type: 'NAVIGATE',
        x: 700,
        reducedMotion: false,
      });
      expect(next).toMatchObject({ phase: 'standing', goal: 'nav', landing: null, targetX: 700 });
      expect(finish(next).phase).toBe('walking');
    });

    it.each<NavPhase>(['jumping', 'pointing', 'perched'])(
      'while %s, jumps back with a new token, then walks',
      (phase) => {
        const state = at(phase, 100, 5, 'card');
        const next = navReducer(state, { type: 'NAVIGATE', x: 700, reducedMotion: false });
        expect(next).toMatchObject({ phase: 'jumping', goal: 'nav', landing: null, targetX: 700 });
        expect(next.token).toBeGreaterThan(state.token);
        expect(finish(next).phase).toBe('walking');
      },
    );

    it('in the air on the way back, only changes where it walks to', () => {
      const state = at('jumping', 100, 5, 'nav');
      const next = navReducer(state, { type: 'NAVIGATE', x: 700, reducedMotion: false });
      expect(next).toEqual({ ...state, targetX: 700 });
    });

    it('rapid navigation from the card keeps only the last target', () => {
      let state = at('perched', 100, 5, 'card');
      for (const x of [200, 300, 400]) {
        state = navReducer(state, { type: 'NAVIGATE', x, reducedMotion: false });
      }
      expect(state).toMatchObject({ phase: 'jumping', goal: 'nav', targetX: 400 });
    });

    it.each<NavPhase>(['jumping', 'pointing', 'perched'])(
      'with reduced motion, while %s, is seated on the nav at once',
      (phase) => {
        const next = navReducer(at(phase, 100, 5, 'card'), {
          type: 'NAVIGATE',
          x: 700,
          reducedMotion: true,
        });
        expect(next).toMatchObject({ phase: 'seated', goal: 'nav', landing: null, targetX: 700 });
      },
    );
  });

  describe('the layout moving', () => {
    it('updates the landing while heading for the card', () => {
      const moved = { ...LANDING, x: 950 };
      const next = navReducer(at('perched', 100, 5, 'card'), {
        type: 'MOVE_LANDING',
        landing: moved,
      });
      expect(next.landing).toEqual(moved);
      expect(next.phase).toBe('perched');
    });

    it('returns to the nav when the card has no more room', () => {
      const next = navReducer(at('perched', 100, 5, 'card'), {
        type: 'MOVE_LANDING',
        landing: null,
      });
      expect(next).toMatchObject({ phase: 'jumping', goal: 'nav', landing: null });
    });

    it('ignores a landing once it has left for the nav', () => {
      const state = at('jumping', 100, 5, 'nav');
      expect(navReducer(state, { type: 'MOVE_LANDING', landing: LANDING })).toBe(state);
    });
  });
});
