import { type Dispatch, useEffect } from 'react';
import type { MascotEvent, MascotState } from './machine.ts';

/** How long the mascot keeps pointing at the Fun Fact before resting. */
export const POINT_MS = 2500;
/** Extra time before the fallback assumes a walk ended (if transitionend never fires). */
export const ARRIVAL_FALLBACK_MARGIN_MS = 100;

/**
 * Schedules the timers for the current move: the walk's arrival fallback and the end of
 * pointing. Each timer is cleared whenever the pose or move changes and on unmount, so stale
 * timers can never fire; the reducer also ignores events for older moves.
 */
export function useMascotTimers(state: MascotState, dispatch: Dispatch<MascotEvent>) {
  const { pose, move, walkMs } = state;

  useEffect(() => {
    if (pose === 'idle') return;
    const timer =
      pose === 'walking'
        ? window.setTimeout(
            () => dispatch({ type: 'ARRIVED', move }),
            walkMs + ARRIVAL_FALLBACK_MARGIN_MS,
          )
        : window.setTimeout(() => dispatch({ type: 'REST', move }), POINT_MS);
    return () => window.clearTimeout(timer);
  }, [pose, move, walkMs, dispatch]);
}
