import type { SectionApp, SectionContext } from '../microfrontends/contract.ts';

/**
 * A plain-DOM (non-React) section app, standing in for a future Vue app in tests. It proves the
 * shell's contract is framework-agnostic and records its lifecycle for assertions.
 */

interface FakeAppOptions {
  /** Mount completes only when this promise resolves. */
  mountDelay?: Promise<void>;
  /** Adds its DOM, then fails synchronously or asynchronously. */
  failMount?: 'sync' | 'async';
  failUnmount?: boolean;
  /** A misbehaving app whose unmount() leaves its DOM behind. */
  leakOnUnmount?: boolean;
}

export interface FakeAppStats {
  mounts: number;
  unmounts: number;
  /** Instances currently mounted (counted from the start of mount). */
  active: number;
  /** Highest number of instances mounted at the same time. */
  peakActive: number;
  lastElement?: HTMLElement;
  lastContext?: SectionContext;
}

export function createFakeSectionApp(options: FakeAppOptions = {}) {
  const stats: FakeAppStats = { mounts: 0, unmounts: 0, active: 0, peakActive: 0 };
  const views: HTMLElement[] = [];

  const app: SectionApp = {
    mount(el, ctx) {
      stats.mounts += 1;
      stats.active += 1;
      stats.peakActive = Math.max(stats.peakActive, stats.active);
      stats.lastElement = el;
      stats.lastContext = ctx;

      const view = document.createElement('div');
      view.dataset.fakeApp = '';
      const heading = document.createElement('h1');
      heading.textContent = 'Fake remote section';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Go to About';
      button.addEventListener('click', () => ctx.navigate('/about'));
      view.append(heading, button);
      el.append(view);
      views.push(view);

      if (options.failMount === 'sync') throw new Error('mount failed');
      if (options.failMount === 'async') {
        return Promise.resolve().then(() => {
          throw new Error('mount failed asynchronously');
        });
      }
      const ready = () => ctx.emit({ type: 'ready' });
      if (options.mountDelay) return options.mountDelay.then(ready);
      ready();
    },
    unmount() {
      stats.unmounts += 1;
      stats.active = Math.max(0, stats.active - 1);
      const view = views.pop();
      if (!options.leakOnUnmount) view?.remove();
      if (options.failUnmount) throw new Error('unmount failed');
    },
  };

  return { app, stats, load: () => Promise.resolve<unknown>(app) };
}
