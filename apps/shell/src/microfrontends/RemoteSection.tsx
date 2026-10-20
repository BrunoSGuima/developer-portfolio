import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMessages } from '../i18n/context.ts';
import {
  DEFAULT_LOCALE,
  type Locale,
  localeConfig,
  localizePath,
  stripLocale,
} from '../i18n/locales.ts';
import { isSectionApp, type SectionApp, type SectionContext, type ShellEvent } from './contract.ts';

interface RemoteSectionProps {
  /** Loads the section app's module (e.g. a dynamic import of its entry URL). */
  load: () => Promise<unknown>;
  basePath: string;
  /** The shell's language, passed to the app as `ctx.locale` (a BCP 47 tag). */
  locale?: Locale;
  onEvent?: (event: ShellEvent) => void;
}

/**
 * Hosts an independently built section app (ADR-0002) inside the React shell.
 *
 * Each effect run is one mount attempt with its own mount point and `cancelled` flag, so
 * StrictMode re-runs, fast navigation and late promises can never leave a stale or duplicate
 * app behind. Failures are re-thrown during render, so the route's error element shows them
 * inside the shell.
 *
 * A language switch changes the URL prefix, which matches another route: the app is unmounted
 * and mounted again with the new `locale` (no change notification needed; ADR-0002).
 */
function RemoteSection({ load, basePath, locale = DEFAULT_LOCALE, onEvent }: RemoteSectionProps) {
  const messages = useMessages();
  const hostRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const onEventRef = useRef(onEvent);
  const [isMounted, setIsMounted] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);

  useEffect(() => {
    navigateRef.current = navigate;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let mountedApp: SectionApp | undefined;
    // A fresh element per attempt: one attempt's cleanup can never touch another's DOM.
    const mountPoint = document.createElement('div');
    host.append(mountPoint);

    const ctx: SectionContext = {
      basePath,
      locale: localeConfig[locale].htmlLang,
      // Paths are language-neutral for the app: the shell keeps the visitor's language.
      navigate: (to) => void navigateRef.current(localizePath(stripLocale(to), locale)),
      emit: (event) => onEventRef.current?.(event),
    };

    function teardown(app: SectionApp) {
      try {
        app.unmount();
      } catch (error) {
        console.error('Remote section unmount() failed:', error);
      }
      mountPoint.remove();
    }

    async function attempt() {
      const module = await load();
      if (cancelled) return;
      if (!isSectionApp(module)) {
        throw new Error('A remote section module must export mount() and unmount().');
      }
      try {
        await module.mount(mountPoint, ctx);
      } catch (error) {
        teardown(module); // best-effort cleanup of a partial mount
        throw error;
      }
      if (cancelled) {
        teardown(module); // the host went away while mount() was pending
        return;
      }
      mountedApp = module;
      setIsMounted(true);
    }

    attempt().catch((error: unknown) => {
      mountPoint.remove();
      if (!cancelled) setFailure({ error });
    });

    return () => {
      cancelled = true;
      if (mountedApp) teardown(mountedApp);
      else if (!mountPoint.hasChildNodes()) mountPoint.remove();
    };
  }, [load, basePath, locale]);

  if (failure) throw failure.error;

  return (
    <>
      {!isMounted && <p role="status">{messages.remote.loading}</p>}
      <div ref={hostRef} />
    </>
  );
}

export default RemoteSection;
