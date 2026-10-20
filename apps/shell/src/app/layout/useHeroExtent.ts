import { type RefObject, useLayoutEffect } from 'react';

/** The page's hero block and the shell's illustrated stage: the backdrop covers both. */
const HERO = '[data-slot="hero"]';
const STAGE = '[data-composition="hero"]';

/**
 * While `enabled` (Home), keeps two values on the region:
 * - `--home-hero-bottom`: the distance from the region's top to the lower of the page's hero
 *   block and the illustrated stage, so the full-bleed backdrop always covers both (the mascot
 *   keeps standing on the desk) whatever the text wraps to;
 * - `--home-stage-block`: the stage's rendered height. It equals `--home-stage-height` from 80rem
 *   and grows with the card between 64rem and 80rem (the mascot stands below the card there), so
 *   HomePage's spacer keeps the "What I do" cards below the mascot's feet.
 * Waits for the (lazy) page to render the hero.
 */
export function useHeroExtent(regionRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!enabled || !region) return;

    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;

    const update = () => {
      const hero = region.querySelector(HERO);
      if (!hero) return;
      const stage = region.querySelector(STAGE);
      const lowest = Math.max(
        hero.getBoundingClientRect().bottom,
        stage?.getBoundingClientRect().bottom ?? 0,
      );
      const bottom = lowest - region.getBoundingClientRect().top;
      if (bottom > 0) region.style.setProperty('--home-hero-bottom', `${Math.round(bottom)}px`);
      const stageHeight = stage?.getBoundingClientRect().height ?? 0;
      if (stageHeight > 0) region.style.setProperty('--home-stage-block', `${stageHeight}px`);
    };

    const attach = () => {
      const hero = region.querySelector(HERO);
      if (!hero) return false;
      update();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(hero);
        resizeObserver.observe(region);
        const stage = region.querySelector(STAGE);
        if (stage) resizeObserver.observe(stage);
      }
      return true;
    };

    if (!attach()) {
      mutationObserver = new MutationObserver(() => {
        if (attach()) mutationObserver?.disconnect();
      });
      mutationObserver.observe(region, { childList: true, subtree: true });
    }

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      region.style.removeProperty('--home-hero-bottom');
      region.style.removeProperty('--home-stage-block');
    };
  }, [regionRef, enabled]);
}
