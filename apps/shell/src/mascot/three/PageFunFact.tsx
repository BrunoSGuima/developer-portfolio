import { useSyncExternalStore } from 'react';
import FunFact from '../../components/FunFact/FunFact.tsx';
import type { FunFact as SectionFact } from '../../sections/registry.ts';
import { DESKTOP_QUERY } from '../useMediaQuery.ts';
import { mascotFactFor } from './funFacts.ts';

/** The same rule as gate.css: he is the mascot on a desktop width, from the first paint, unless 3D has failed. */
const is3DExperience = () =>
  window.matchMedia(DESKTOP_QUERY).matches &&
  document.documentElement.dataset['mascot2d'] === undefined;

function subscribe(onChange: () => void) {
  const width = window.matchMedia(DESKTOP_QUERY);
  width.addEventListener('change', onChange);
  const fallback = new MutationObserver(onChange);
  fallback.observe(document.documentElement, { attributeFilter: ['data-mascot2d'] });
  return () => {
    width.removeEventListener('change', onChange);
    fallback.disconnect();
  };
}

/**
 * Flagged builds only. One fixed fact per page, decided by the page and whether this is the 3D
 * experience, and by nothing else: no history, no timers. One FunFact, so the card stays mounted when
 * its fact changes.
 */
function PageFunFact({ fact, sectionId }: { fact: SectionFact; sectionId: string | undefined }) {
  const in3D = useSyncExternalStore(subscribe, is3DExperience);
  return <FunFact fact={fact} mascotFact={in3D ? mascotFactFor(sectionId) : null} />;
}

export default PageFunFact;
