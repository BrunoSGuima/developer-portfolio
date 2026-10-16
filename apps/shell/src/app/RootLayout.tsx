import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import AppLayout from './layout/AppLayout.tsx';
import { readHandle } from './routeHandle.ts';
import { useRouteFocus } from './useRouteFocus.ts';

export const SITE_TITLE = 'Bruno — Software Engineer';

/** Layout route: the persistent shell around whichever section is active. */
function RootLayout() {
  const matches = useMatches();
  const pageTitle = matches.map((match) => readHandle(match).title).findLast(Boolean);
  useRouteFocus();

  return (
    <>
      <title>{pageTitle ? `${pageTitle} · ${SITE_TITLE}` : SITE_TITLE}</title>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <ScrollRestoration />
    </>
  );
}

export default RootLayout;
