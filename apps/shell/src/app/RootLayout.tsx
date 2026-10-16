import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import FunFact from '../components/FunFact/FunFact.tsx';
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
  useRouteFocus();

  return (
    <>
      <title>{pageTitle ? `${pageTitle} · ${SITE_TITLE}` : SITE_TITLE}</title>
      <AppLayout context={<FunFact fact={section?.funFact ?? shellFunFact} />}>
        <Outlet />
      </AppLayout>
      <ScrollRestoration />
    </>
  );
}

export default RootLayout;
