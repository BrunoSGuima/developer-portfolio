import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/** How long to wait for a heading that renders asynchronously (e.g. a remote section). */
const HEADING_WAIT_MS = 5000;

/**
 * After a client-side navigation, moves focus to the new page's <h1> so keyboard and screen
 * reader users land on (and hear) the new content. Skipped on the initial page load.
 *
 * If the heading is not there yet (a remote section mounts asynchronously), waits for it to
 * appear in <main>, until the next navigation or HEADING_WAIT_MS.
 */
export function useRouteFocus() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    if (focusPageHeading()) return;
    const main = document.querySelector('main');
    if (!main) return;

    const observer = new MutationObserver(() => {
      if (focusPageHeading()) stop();
    });
    const timeout = window.setTimeout(stop, HEADING_WAIT_MS);
    observer.observe(main, { childList: true, subtree: true });

    function stop() {
      observer.disconnect();
      window.clearTimeout(timeout);
    }
    return stop;
  }, [pathname]);
}

function focusPageHeading(): boolean {
  const heading = document.querySelector<HTMLElement>('main h1');
  if (!heading) return false;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  return true;
}
