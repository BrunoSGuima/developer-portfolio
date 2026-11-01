import { type RefObject, useEffect, useRef } from 'react';
import { DESKTOP_QUERY, useMediaQuery, useReducedMotion } from '../useMediaQuery.ts';
import { measureFocusRing, measureNavAnchor } from './anchors.ts';
import { canRun3D } from './capabilities.ts';
import type { MascotEngine } from './engine.ts';
import { JumpTimer } from './jumpTimer.ts';
import { type CardLanding, measureLanding } from './landing.ts';

/** What the director adds to the engine's debug API, for the flagged build's tests. */
interface DirectorDebug {
  /** Runs what happens when the delay ends, now. */
  jumpNow: () => void;
  /** Keeps the delay from running, so a slow test machine can't start a stray jump. */
  holdTimer: () => void;
  timerRunning: () => boolean;
  /** When the delay last started, by Date.now(); null if it never has. */
  delayStartedAt: () => number | null;
  landing: () => CardLanding | null;
}

/** Set by the flagged build's tests and the report; nothing reads it in the app. */
declare global {
  interface Window {
    __mascot3d?: MascotEngine['debug'] & DirectorDebug;
  }
}

/** Once WebGL has failed in this visit, stay on the 2D mascot: no retry loop. */
let failed = false;

export const resetFailureForTests = () => {
  failed = false;
};

const whenIdle = (run: () => void) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(run, { timeout: 1500 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(run, 200);
  return () => clearTimeout(id);
};

/** Focus that the jump must not disturb: a visible ring on a nav link, or a field being typed in. */
function focusHoldsJump(): boolean {
  const focused = document.activeElement;
  if (!focused) return false;
  if (focused.matches('input, textarea, select, [contenteditable="true"]')) return true;
  return focused.closest('header') !== null && focused.matches(':focus-visible');
}

/** Pixels of the card that must show below its top edge: enough to see where he lands. */
const LANDING_MARGIN = 24;

/** Whether the card's top edge, where he lands, is on screen. A tall card may never fit whole. */
function landingOnScreen(): boolean {
  const card = document.querySelector('[data-fun-fact]')?.getBoundingClientRect();
  return card !== undefined && card.top >= 0 && card.top + LANDING_MARGIN <= window.innerHeight;
}

/**
 * Connects the shell to the engine: route, language and layout events go in as commands, and React
 * never renders per frame. The engine loads after the first paint, only on desktop, and the 2D nav
 * mascot is hidden only once the first 3D frame exists.
 */
export function useMascotDirector(
  overlay: RefObject<HTMLElement | null>,
  sectionId: string | undefined,
  locale: string,
) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const reducedMotion = useReducedMotion();
  const engine = useRef<MascotEngine | null>(null);
  const placedSection = useRef<string | undefined>(undefined);
  const placedLocale = useRef(locale);
  // What a slow engine load must start from: written by effects, read when the load finishes.
  const latest = useRef({ sectionId, reducedMotion });
  /** This page visit's one jump has happened: it stays on the card until the next navigation. */
  const jumped = useRef(false);
  /** The delay ended, but focus or a hidden card holds the jump back. */
  const pending = useRef(false);
  const held = useRef(false);
  const delayStartedAt = useRef<number | null>(null);
  const timer = useRef<JumpTimer | null>(null);

  /** What happens when the delay ends, and again whenever whatever held it back changes. */
  const tryJump = useRef(() => {
    const current = engine.current;
    if (!current || !current.isSeated() || jumped.current) return;
    if (latest.current.reducedMotion || latest.current.sectionId === undefined) return;
    pending.current = true;
    if (focusHoldsJump() || !landingOnScreen()) return;
    const anchor = measureNavAnchor();
    const landing = anchor ? measureLanding(anchor.x, anchor.size) : null;
    if (!landing) return; // no room in this layout: a later resize may make some
    pending.current = false;
    jumped.current = true;
    current.jumpToCard(landing);
  });

  const startDelay = useRef(() => {
    if (held.current || jumped.current || pending.current) return;
    if (latest.current.reducedMotion || latest.current.sectionId === undefined) return;
    timer.current ??= new JumpTimer(() => tryJump.current());
    timer.current.start();
    delayStartedAt.current = Date.now();
  });

  useEffect(() => {
    latest.current = { sectionId, reducedMotion };
  }, [sectionId, reducedMotion]);

  // The engine's lifetime depends only on the width: routes must never remount it.
  useEffect(() => {
    const host = overlay.current;
    if (!isDesktop || !host || failed) return;
    let cancelled = false;

    const stop = () => {
      timer.current?.cancel();
      pending.current = false;
      jumped.current = false;
      engine.current?.dispose();
      engine.current = null;
      placedSection.current = undefined;
      delete window.__mascot3d;
      delete document.documentElement.dataset['mascot3d'];
    };

    const cancelIdle = whenIdle(() => {
      if (cancelled || !canRun3D()) return;
      import('./engine.ts')
        .then(({ createMascotEngine }) =>
          createMascotEngine(host, {
            reducedMotion: latest.current.reducedMotion,
            onContextLost: () => {
              failed = true;
              stop();
            },
            onSeated: () => startDelay.current(),
          }),
        )
        .then((created) => {
          const anchor = measureNavAnchor();
          if (cancelled || !anchor) {
            created.dispose();
            return;
          }
          engine.current = created;
          placedSection.current = latest.current.sectionId;
          placedLocale.current = locale;
          window.__mascot3d = {
            ...created.debug,
            jumpNow: () => tryJump.current(),
            holdTimer: () => {
              held.current = true;
              timer.current?.cancel();
            },
            timerRunning: () => timer.current?.running ?? false,
            delayStartedAt: () => delayStartedAt.current,
            landing: () => {
              const now = measureNavAnchor();
              return now ? measureLanding(now.x, now.size) : null;
            },
          };
          created.place(anchor);
          document.documentElement.dataset['mascot3d'] = 'active';
        })
        .catch(() => {
          // A failed chunk, model or context: the 2D mascot was never hidden.
          failed = true;
        });
    });

    return () => {
      cancelled = true;
      cancelIdle();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [isDesktop, overlay]);

  // The active section changed: the trip, and a fresh visit.
  useEffect(() => {
    const current = engine.current;
    if (!current) return;
    if (sectionId === undefined) {
      // Not-found and error pages: stay put, with no jump.
      timer.current?.cancel();
      pending.current = false;
      return;
    }
    if (placedSection.current === sectionId) {
      // Back from a page with no section, to the same one: it never left.
      if (current.isSeated() && !timer.current?.running) startDelay.current();
      return;
    }
    placedSection.current = sectionId;
    timer.current?.cancel();
    pending.current = false;
    jumped.current = false;
    const anchor = measureNavAnchor();
    if (anchor) current.navigate(anchor);
  }, [sectionId]);

  // Language switch: same section, but the link moved (labels changed width). No trip.
  useEffect(() => {
    if (placedLocale.current === locale) return;
    placedLocale.current = locale;
    const anchor = measureNavAnchor();
    if (anchor) engine.current?.reanchor(anchor);
  }, [locale]);

  // Layout changes (resize, scrollbars, fonts, the card's text): re-measure. Events only, never per
  // frame. The card moves the moment a route commits, so only a trip still heading for it re-reads it.
  useEffect(() => {
    const header = document.querySelector('header');
    const card = document.querySelector('[data-fun-fact]');
    if (!header || typeof ResizeObserver === 'undefined') return;
    const remeasure = () => {
      const current = engine.current;
      const anchor = measureNavAnchor();
      if (!current || !anchor) return;
      current.reanchor(anchor);
      current.setFocusRing(measureFocusRing());
      if (current.isOnCardTrip()) current.moveLanding(measureLanding(anchor.x, anchor.size));
      else if (pending.current) tryJump.current();
    };
    const observer = new ResizeObserver(remeasure);
    observer.observe(header);
    observer.observe(document.documentElement);
    if (card) observer.observe(card);
    void document.fonts?.ready.then(remeasure);
    return () => observer.disconnect();
  }, [sectionId, locale]);

  // The jump waits for its landing spot to be on screen: scrolling changes how much of the card shows.
  useEffect(() => {
    const card = document.querySelector('[data-fun-fact]');
    if (!card || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      () => {
        if (pending.current) tryJump.current();
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [sectionId, locale]);

  // Keyboard focus: in the header, rise above a ring it would touch, and settle back afterwards.
  useEffect(() => {
    const syncRing = () => {
      engine.current?.setFocusRing(measureFocusRing());
      if (pending.current) tryJump.current();
    };
    document.addEventListener('focusin', syncRing);
    document.addEventListener('focusout', syncRing);
    return () => {
      document.removeEventListener('focusin', syncRing);
      document.removeEventListener('focusout', syncRing);
    };
  }, []);

  // A hidden tab keeps the time the delay had left.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) timer.current?.pause();
      else timer.current?.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      timer.current?.cancel();
      pending.current = false;
      jumped.current = false;
    }
    engine.current?.setReducedMotion(reducedMotion);
    if (!reducedMotion && engine.current?.isSeated()) startDelay.current();
  }, [reducedMotion]);
}
