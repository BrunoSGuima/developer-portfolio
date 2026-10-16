import { act, render, screen, waitFor } from '@testing-library/react';
import { Component, type ReactNode, StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { deferred, settle } from '../test/deferred.ts';
import { createFakeSectionApp } from '../test/fakeSectionApp.ts';
import type { ShellEvent } from './contract.ts';
import RemoteSection from './RemoteSection.tsx';

/** Stand-in for the route error element: shows the error RemoteSection throws while rendering. */
class CatchError extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    return this.state.error ? <p role="alert">{this.state.error.message}</p> : this.props.children;
  }
}

interface HostOptions {
  strict?: boolean;
  onEvent?: (event: ShellEvent) => void;
}

function renderHost(load: () => Promise<unknown>, { strict = false, onEvent }: HostOptions = {}) {
  const host = (
    <MemoryRouter>
      <CatchError>
        {onEvent ? (
          <RemoteSection load={load} basePath="/remote" onEvent={onEvent} />
        ) : (
          <RemoteSection load={load} basePath="/remote" />
        )}
      </CatchError>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{host}</StrictMode> : host);
}

const fakeViews = () => document.querySelectorAll('[data-fake-app]');

/** Lets pending promise callbacks (load → mount) run. */
const flush = () => act(async () => {});

let consoleError: MockInstance<typeof console.error>;
beforeEach(() => {
  // React and RemoteSection log caught errors; keep output clean and let tests assert on it.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  consoleError.mockRestore();
});

describe('RemoteSection: happy path', () => {
  it('shows a loading status, then mounts the app into an element it owns', async () => {
    const { app, stats } = createFakeSectionApp();
    const pending = deferred<unknown>();
    renderHost(() => pending.promise);

    expect(screen.getByRole('status')).toHaveTextContent('Loading section…');

    await settle(() => pending.resolve(app));

    expect(screen.getByRole('heading', { name: 'Fake remote section' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(stats.lastElement?.isConnected).toBe(true);
    expect(stats.lastContext?.basePath).toBe('/remote');
  });

  it('forwards events emitted by the app to onEvent', async () => {
    const { load } = createFakeSectionApp();
    const onEvent = vi.fn();
    renderHost(load, { onEvent });
    await flush();

    expect(onEvent).toHaveBeenCalledWith({ type: 'ready' });
  });
});

describe('RemoteSection: lifecycle', () => {
  it('never mounts if the host unmounts while load() is pending', async () => {
    const { app, stats } = createFakeSectionApp();
    const pending = deferred<unknown>();
    const { unmount } = renderHost(() => pending.promise);

    unmount();
    await settle(() => pending.resolve(app));

    expect(stats.mounts).toBe(0);
    expect(fakeViews()).toHaveLength(0);
  });

  it('ignores a load() failure that settles after the host unmounted', async () => {
    const pending = deferred<unknown>();
    const { unmount } = renderHost(() => pending.promise);

    unmount();
    await settle(() => pending.reject(new Error('late failure')));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('unmounts exactly once when the host unmounts while mount() is pending', async () => {
    const mountDone = deferred();
    const { load, stats } = createFakeSectionApp({ mountDelay: mountDone.promise });
    const { unmount } = renderHost(load);
    await flush();
    expect(stats.mounts).toBe(1);

    unmount();
    expect(stats.unmounts).toBe(0);
    await settle(() => mountDone.resolve());

    expect(stats.unmounts).toBe(1);
    expect(stats.peakActive).toBe(1);
    expect(fakeViews()).toHaveLength(0);
  });

  it('unmounts exactly once and removes the app element on normal unmount', async () => {
    const { load, stats } = createFakeSectionApp();
    const { unmount } = renderHost(load);
    await flush();

    unmount();

    expect(stats.unmounts).toBe(1);
    expect(stats.lastElement?.isConnected).toBe(false);
    expect(fakeViews()).toHaveLength(0);
  });

  it('keeps a single instance under StrictMode (mount → cleanup → mount)', async () => {
    const pending = deferred<unknown>();
    const { app, stats } = createFakeSectionApp();
    const { unmount } = renderHost(() => pending.promise, { strict: true });

    // StrictMode's first attempt was cleaned up while load() was still pending.
    await settle(() => pending.resolve(app));

    expect(stats.mounts).toBe(1);
    expect(stats.peakActive).toBe(1);
    expect(fakeViews()).toHaveLength(1);

    unmount();
    expect(stats.mounts).toBe(stats.unmounts);
    expect(fakeViews()).toHaveLength(0);
  });

  it('keeps a single instance under StrictMode when load() resolves immediately', async () => {
    const { load, stats } = createFakeSectionApp();
    const { unmount } = renderHost(load, { strict: true });
    await flush();

    expect(stats.peakActive).toBe(1);
    expect(fakeViews()).toHaveLength(1);

    unmount();
    expect(stats.mounts).toBe(stats.unmounts);
  });

  it('survives repeated mount/unmount cycles without duplicates', async () => {
    const { load, stats } = createFakeSectionApp();

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      const { unmount } = renderHost(load);
      await flush();
      expect(stats.mounts).toBe(cycle);
      expect(fakeViews()).toHaveLength(1);

      unmount();
      expect(stats.unmounts).toBe(cycle);
      expect(fakeViews()).toHaveLength(0);
    }
    expect(stats.peakActive).toBe(1);
  });

  it("discards a previous attempt's DOM even if the app's unmount() leaves it behind", async () => {
    const first = createFakeSectionApp({ leakOnUnmount: true });
    const second = createFakeSectionApp();
    const { rerender } = renderHost(first.load);
    await flush();
    expect(fakeViews()).toHaveLength(1);

    // A new `load` re-runs the mount effect while the host element stays on the page.
    rerender(
      <MemoryRouter>
        <CatchError>
          <RemoteSection load={second.load} basePath="/remote" />
        </CatchError>
      </MemoryRouter>,
    );
    await flush();

    expect(first.stats.unmounts).toBe(1);
    expect(first.stats.lastElement?.isConnected).toBe(false);
    expect(fakeViews()).toHaveLength(1);
  });

  it.each(['sync', 'async'] as const)(
    'cleans up safely when mount() fails part-way (%s)',
    async (failMount) => {
      const { load, stats } = createFakeSectionApp({ failMount });
      renderHost(load);
      await flush();

      expect(await screen.findByRole('alert')).toHaveTextContent(/^mount failed/);
      expect(stats.unmounts).toBe(1);
      expect(stats.lastElement?.isConnected).toBe(false);
      expect(fakeViews()).toHaveLength(0);
    },
  );

  it('reports the original mount error even if the cleanup unmount() also throws', async () => {
    const { load, stats } = createFakeSectionApp({ failMount: 'sync', failUnmount: true });
    renderHost(load);
    await flush();

    expect(await screen.findByRole('alert')).toHaveTextContent('mount failed');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('unmount'),
      expect.objectContaining({ message: 'unmount failed' }),
    );
    expect(stats.lastElement?.isConnected).toBe(false);
  });

  it('does not crash when unmount() throws during normal cleanup', async () => {
    const { load, stats } = createFakeSectionApp({ failUnmount: true });
    const { unmount } = renderHost(load);
    await flush();

    expect(() => unmount()).not.toThrow();
    expect(stats.unmounts).toBe(1);
    expect(stats.lastElement?.isConnected).toBe(false);
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('unmount'),
        expect.objectContaining({ message: 'unmount failed' }),
      ),
    );
  });
});
