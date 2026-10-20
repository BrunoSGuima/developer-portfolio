import { describe, expect, it } from 'vitest';
import { initialMascotState, type MascotState, mascotReducer } from './machine.ts';

const idleAt = (x: number): MascotState => ({ ...initialMascotState(), x });

const navigate = (fromX: number, x: number, reducedMotion = false) =>
  ({ type: 'NAVIGATE', fromX, x, pointFacing: 'left', reducedMotion }) as const;

describe('mascot state machine', () => {
  it('PLACE snaps to a position without walking', () => {
    const next = mascotReducer(idleAt(0), { type: 'PLACE', x: 120 });

    expect(next).toMatchObject({ pose: 'idle', x: 120, move: 0 });
  });

  it('NAVIGATE walks toward the target, facing the direction of travel', () => {
    const right = mascotReducer(idleAt(100), navigate(100, 300));
    const left = mascotReducer(idleAt(300), navigate(300, 100));

    expect(right).toMatchObject({ pose: 'walking', x: 300, facing: 'right', move: 1 });
    expect(left).toMatchObject({ pose: 'walking', x: 100, facing: 'left', move: 1 });
    expect(right.walkMs).toBeGreaterThan(0);
  });

  it('NAVIGATE with reduced motion teleports and points at once', () => {
    const next = mascotReducer(idleAt(100), navigate(100, 300, true));

    expect(next).toMatchObject({ pose: 'pointing', x: 300, facing: 'left', walkMs: 0 });
  });

  it('NAVIGATE to where the mascot already is points without walking', () => {
    const next = mascotReducer(idleAt(200), navigate(200, 200));

    expect(next).toMatchObject({ pose: 'pointing', facing: 'left' });
  });

  it('increments the move id on every NAVIGATE', () => {
    let state = idleAt(0);
    state = mascotReducer(state, navigate(0, 100));
    state = mascotReducer(state, navigate(50, 200));

    expect(state.move).toBe(2);
  });

  it('ARRIVED for the current move turns toward the Fun Fact and points', () => {
    const walking = mascotReducer(idleAt(100), navigate(100, 300)); // facing right, pointFacing left
    const arrived = mascotReducer(walking, { type: 'ARRIVED', move: walking.move });

    expect(arrived).toMatchObject({ pose: 'pointing', facing: 'left' });
  });

  it('REST for the current move goes back to idle', () => {
    const pointing = mascotReducer(idleAt(100), navigate(100, 100));
    const rested = mascotReducer(pointing, { type: 'REST', move: pointing.move });

    expect(rested.pose).toBe('idle');
  });

  describe('stale events never change the pose', () => {
    it('ignores ARRIVED from an earlier walk', () => {
      let state = mascotReducer(idleAt(0), navigate(0, 100)); // move 1
      state = mascotReducer(state, navigate(60, 400)); // move 2, still walking

      expect(mascotReducer(state, { type: 'ARRIVED', move: 1 })).toBe(state);
    });

    it('ignores REST from an earlier pointing', () => {
      let state = mascotReducer(idleAt(0), navigate(0, 0)); // move 1, pointing
      state = mascotReducer(state, navigate(0, 300)); // move 2, walking

      expect(mascotReducer(state, { type: 'REST', move: 1 })).toBe(state);
    });

    it('ignores ARRIVED when not walking, and REST when not pointing', () => {
      const idle = idleAt(10);

      expect(mascotReducer(idle, { type: 'ARRIVED', move: 0 })).toBe(idle);
      expect(mascotReducer(idle, { type: 'REST', move: 0 })).toBe(idle);
    });
  });
});
