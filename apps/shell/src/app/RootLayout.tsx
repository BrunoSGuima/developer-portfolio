import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import FunFact from '../components/FunFact/FunFact.tsx';
import FunFactStage from '../mascot/FunFactStage.tsx';
import HeaderMascot from '../mascot/HeaderMascot.tsx';
import HomeBackdrop from '../mascot/HomeBackdrop.tsx';
import { DESKTOP_QUERY, useMediaQuery } from '../mascot/useMediaQuery.ts';
import { shellFunFact } from '../sections/registry.ts';
import AppLayout from './layout/AppLayout.tsx';
import { readHandle } from './routeHandle.ts';
import { useCurrentSection } from './useCurrentSection.ts';
import { useRouteFocus } from './useRouteFocus.ts';

export const SITE_TITLE = 'Bruno Guimarães — Full-Stack Software Engineer';

/** Layout route: the persistent shell around whichever section is active. */
function RootLayout() {
  const matches = useMatches();
  const pageTitle = matches.map((match) => readHandle(match).title).findLast(Boolean);
  const section = useCurrentSection();
  const sectionId = section?.id;
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isHome = sectionId === 'home';
  useRouteFocus();

  return (
    <>
      <title>{pageTitle ? `${pageTitle} · ${SITE_TITLE}` : SITE_TITLE}</title>
      <AppLayout
        headerLane={isDesktop ? <HeaderMascot sectionId={sectionId} /> : undefined}
        backdrop={isHome ? <HomeBackdrop /> : undefined}
        contextPlacement={isHome ? 'stacked' : (section?.contextPlacement ?? 'stacked')}
        context={
          // Home: the mascot presents the card in the illustrated hero. Elsewhere: it peeks over it.
          <FunFactStage composition={isHome ? 'hero' : 'peek'} sectionId={sectionId}>
            <FunFact fact={section?.funFact ?? shellFunFact} />
          </FunFactStage>
        }
      >
        <Outlet />
      </AppLayout>
      <ScrollRestoration />
    </>
  );
}

export default RootLayout;
