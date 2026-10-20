import { type TransitionEvent, useCallback, useEffect, useReducer, useRef } from 'react';
import { facingToward, laneTargetX, MASCOT_WIDTH } from './geometry.ts';
import styles from './HeaderMascot.module.css';
import { initialMascotState, mascotReducer } from './machine.ts';
import MascotSprite from './MascotSprite.tsx';
import { useMascotTimers } from './useMascotTimers.ts';
import { useReducedMotion } from './useMediaQuery.ts';

// Data attributes, not labels: the accessible names are translated.
const ACTIVE_NAV_LINK = '[data-nav="main"] a[aria-current="page"]';
const FUN_FACT_CARD = '[data-fun-fact]';

interface HeaderMascotProps {
  /** The active section; the mascot walks only when this changes (not on sub-path moves). */
  sectionId: string | undefined;
  /** The active language: the nav labels change width with it, so the mascot is re-placed. */
  locale?: string;
}

/**
 * Desktop mascot: lives in the header's lane, walks to the active nav item when the section
 * changes, then turns toward the Fun Fact card and points at it. Decorative only: hidden from
 * assistive technology and never intercepts pointer events.
 */
function HeaderMascot({ sectionId, locale }: HeaderMascotProps) {
  const laneRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const placedSection = useRef<string | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(mascotReducer, undefined, () => initialMascotState());
  useMascotTimers(state, dispatch);

  /** Where the active nav item is, and which way to face to point at the Fun Fact card. */
  const measureTarget = useCallback(() => {
    const lane = laneRef.current?.getBoundingClientRect();
    const link = document.querySelector(ACTIVE_NAV_LINK)?.getBoundingClientRect();
    if (!lane || !link) return null;

    const x = laneTargetX(link, lane);
    const card = document.querySelector(FUN_FACT_CARD)?.getBoundingClientRect();
    const pointFacing = card
      ? facingToward(card.left + card.width / 2, lane.left + x + MASCOT_WIDTH / 2)
      : 'right';
    return { x, pointFacing };
  }, []);

  /** The mascot's on-screen offset right now (mid-walk included). */
  const currentX = useCallback(() => {
    const lane = laneRef.current?.getBoundingClientRect();
    const walker = walkerRef.current?.getBoundingClientRect();
    return lane && walker ? Math.round(walker.left - lane.left) : 0;
  }, []);

  useEffect(() => {
    if (sectionId === undefined) return; // not-found/error pages: stay put
    const target = measureTarget();
    if (!target) return;

    if (placedSection.current === undefined) {
      placedSection.current = sectionId;
      dispatch({ type: 'PLACE', x: target.x });
      return;
    }
    if (placedSection.current === sectionId) return;
    placedSection.current = sectionId;
    dispatch({
      type: 'NAVIGATE',
      fromX: currentX(),
      x: target.x,
      pointFacing: target.pointFacing,
      reducedMotion,
    });
  }, [sectionId, reducedMotion, measureTarget, currentX]);

  // Language switch: same section, but the active link moved (labels changed width). Snap to it
  // without walking.
  const placedLocale = useRef(locale);
  useEffect(() => {
    if (placedLocale.current === locale) return;
    placedLocale.current = locale;
    const target = measureTarget();
    if (target) dispatch({ type: 'PLACE', x: target.x });
  }, [locale, measureTarget]);

  // Layout changes (resize, font load): snap to the active item without walking.
  useEffect(() => {
    const lane = laneRef.current;
    if (!lane || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const target = measureTarget();
      if (target) dispatch({ type: 'PLACE', x: target.x });
    });
    observer.observe(lane);
    return () => observer.disconnect();
  }, [measureTarget]);

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    // Only the walker's own transform transition counts (not the sprite's animations), and only
    // if it ended at the current target: a walk that was re-targeted ends somewhere else.
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    if (state.pose !== 'walking' || Math.abs(currentX() - state.x) > 1) return;
    dispatch({ type: 'ARRIVED', move: state.move });
  }

  return (
    <div ref={laneRef} className={styles.lane} aria-hidden="true" data-mascot="header">
      <div
        ref={walkerRef}
        className={styles.walker}
        data-pose={state.pose}
        data-facing={state.facing}
        style={{
          transform: `translateX(${state.x}px)`,
          transitionDuration: `${state.pose === 'walking' ? state.walkMs : 0}ms`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <MascotSprite pose={state.pose} facing={state.facing} aim="down" />
      </div>
    </div>
  );
}

export default HeaderMascot;
