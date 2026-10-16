/**
 * Framework-agnostic contract between the React shell and independently built section apps
 * (ADR-0002). A section app is an ES module exporting `mount` and `unmount`.
 *
 * Lifecycle rules for section apps:
 * - `mount` may be async; it renders into `el` (an element owned by the shell).
 * - `unmount` must remove everything `mount` created (DOM, listeners, timers).
 * - `mount` may be called again after `unmount` (React StrictMode does this in development, and
 *   so does navigating away and back).
 * - If `mount` fails part-way, the shell calls `unmount` best-effort and then discards the element.
 */

/** Events a section app can send to the shell (e.g. so the mascot can react). */
export type ShellEvent = { type: 'ready' } | { type: 'error'; message: string };

export interface SectionContext {
  /** The section's base path, e.g. "/career". The app owns everything below it. */
  basePath: string;
  /** Navigate through the shell's router (e.g. to another section). */
  navigate(to: string): void;
  emit(event: ShellEvent): void;
}

export interface SectionApp {
  mount(el: HTMLElement, ctx: SectionContext): void | Promise<void>;
  unmount(): void;
}

/** Runtime check for a loaded module, since a remote entry is not type-checked with the shell. */
export function isSectionApp(module: unknown): module is SectionApp {
  if (typeof module !== 'object' || module === null) return false;
  const candidate = module as Record<string, unknown>;
  return typeof candidate.mount === 'function' && typeof candidate.unmount === 'function';
}
