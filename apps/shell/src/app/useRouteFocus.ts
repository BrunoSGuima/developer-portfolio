import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * After a client-side navigation, moves focus to the new page's <h1> so keyboard and screen
 * reader users land on (and hear) the new content. Skipped on the initial page load.
 */
export function useRouteFocus() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const heading = document.querySelector<HTMLElement>('main h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [pathname]);
}
