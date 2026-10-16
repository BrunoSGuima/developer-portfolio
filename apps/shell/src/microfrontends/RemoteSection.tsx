import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { isSectionApp, type SectionApp, type SectionContext, type ShellEvent } from './contract.ts';

interface RemoteSectionProps {
  /** Loads the section app's module (e.g. a dynamic import of its entry URL). */
  load: () => Promise<unknown>;
  basePath: string;
  onEvent?: (event: ShellEvent) => void;
}

/**
 * Hosts an independently built section app (ADR-0002) inside the React shell.
 *
 * Each effect run is one mount attempt with its own mount point and `cancelled` flag, so
 * StrictMode re-runs, fast navigation and late promises can never leave a stale or duplicate
 * app behind. Failures are re-thrown during render, so the route's error element shows them
 * inside the shell.
 */
function RemoteSection({ load, basePath, onEvent }: RemoteSectionProps) {
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
      navigate: (to) => void navigateRef.current(to),
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
  }, [load, basePath]);

  if (failure) throw failure.error;

  return (
    <>
      {!isMounted && <p role="status">Loading section…</p>}
      <div ref={hostRef} />
    </>
  );
}

export default RemoteSection;
