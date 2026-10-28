# ADR-0002: Framework-agnostic mount contract for microfrontends

- **Status:** Accepted (host implemented in Phase 1, Step 6)
- **Date:** 2026-10-16

## Context

From Phase 5 (renumbered 2026-10-24; see docs/ROADMAP.md), sections built with Vue 3 (and possibly other frameworks) must appear inside the
React shell (ADR-0001) with seamless navigation: no full-page reloads, the shell (navigation,
mascot, Fun Fact) stays mounted, and each app remains independently developed, built and
deployed. Sub-apps also need to report events back to the shell (e.g. "data loaded") so the
mascot and Fun Fact can react.

## Decision

Each non-React section exposes a minimal, framework-agnostic ES-module contract:

```ts
interface SectionContext {
  basePath: string; // e.g. "/career", or "/pt-br/career" in Portuguese
  locale: string; // the shell's language, a BCP 47 tag: 'en' | 'pt-BR' (ADR-0007)
  navigate(path: string): void; // cross-section navigation; language-neutral paths
  emit(event: ShellEvent): void; // typed events back to the shell
}

interface SectionApp {
  mount(el: HTMLElement, ctx: SectionContext): void | Promise<void>;
  unmount(): void;
}
```

- The sub-app is built independently (Vite library mode) and served **same-origin**, e.g.
  `/apps/career/entry.js`.
- The registry declares such a section with `mount: remoteMount('/apps/career/entry.js')`. Its
  shell route is `/career/*` and renders `<RemoteSection load=… basePath="/career">`
  (`apps/shell/src/microfrontends/`), which loads the module with dynamic `import()`, validates
  it (`isSectionApp`), mounts it, and unmounts it when the route is left.
- **Routing:** the shell owns browser history and top-level routes. The sub-app handles only its
  own sub-routes under `basePath` (Vue: `createWebHistory(basePath)`) and uses `ctx.navigate` for
  cross-section links.
- **Styling:** sub-apps render in light DOM, inherit shared design tokens (CSS custom properties
  on `:root`) and use scoped styles. No Shadow DOM.
- In Phase 1 (Step 6) the contract and the `<RemoteSection>` host are implemented and tested with
  a plain-DOM (non-React) fake app; no real section uses them yet.

### Lifecycle guarantees of the host

- `mount` may be async; `unmount` must remove everything `mount` created; `mount` may be called
  again after `unmount` (React StrictMode and navigating away and back both do this).
- Each mount attempt gets its own mount point and a `cancelled` flag:
  - leaving while `load()` is pending: `mount` is never called, and a late failure is ignored;
  - leaving while `mount()` is pending: `unmount` runs once `mount` settles;
  - at most one instance is active; the mount count equals the unmount count once the host is gone.
- If `mount` fails part-way, the host calls `unmount` best-effort and discards the mount point;
  the original error is reported (a cleanup error is only logged).
- `load` / validation / `mount` errors, including asynchronous ones after the first render, are
  re-thrown during render, so the route's error element shows them inside the shell.
- Moving between sub-paths of the section (`/career/a` → `/career/b`) does not remount the app.

### Language (added in Step 9, ADR-0007)

- `ctx.locale` is the shell's language; the app renders in it with its own translations (e.g.
  vue-i18n seeded from `ctx.locale`). The shell only passes the code.
- `basePath` includes the language prefix, so the app's own router stays inside it.
- `ctx.navigate('/about')` takes a language-neutral path; the shell keeps the visitor's language
  (`/pt-br/about`). Language switching is the shell's job.
- A language switch changes the URL prefix, which matches another route subtree: the app is
  unmounted and mounted again with the new `locale`. No change notification is needed (tested).

## Known limitation: URL synchronisation between routers

Not solved in Step 6, deliberately: nothing can consume or test a solution until a real sub-app
exists. It must be decided in Phase 5, before the Vue app uses its own router.

| Scenario                                                                                                                 | React Router (shell)           | Vue Router (`createWebHistory`)                  | Risk                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Back / Forward                                                                                                           | Listens to `popstate`: updates | Listens to `popstate`: updates                   | Both react independently; update order and double handling are untested.                        |
| Shell-initiated navigation inside the sub-app's path (nav click `/career/x` → `/career`, or `ctx.navigate('/career/y')`) | Updates (it pushed)            | Not notified: `history.pushState` fires no event | The sub-app shows a stale view.                                                                 |
| Sub-app-initiated navigation (`router.push('/career/y')` in Vue)                                                         | Not notified                   | Updates                                          | The shell's location is stale: nav highlight, title and the next shell navigation can be wrong. |
| Leaving the section via `ctx.navigate('/about')`                                                                         | Updates; unmounts the sub-app  | Torn down                                        | Fine (covered by Step 6 tests).                                                                 |

Candidate fixes to evaluate in Phase 5:

1. Make the shell the single source of truth: add `ctx.onLocationChange(listener)` and route the
   sub-app's internal navigation through `ctx.navigate`.
2. Use Vue Router's `createMemoryHistory`, synchronised both ways through `ctx`.
3. A shared history adapter used by both routers.

## Alternatives considered

| Option                                 | Why not (for now)                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| single-spa                             | Mature, but adds its own router and lifecycle conventions on top of React Router; overkill for two frameworks.                                         |
| Web Components (`defineCustomElement`) | Standard, but Shadow DOM complicates shared tokens and fonts, typing of props and events is weaker, and Vue custom elements have caveats with plugins. |
| Module Federation                      | Runtime dependency sharing we don't need (React and Vue share nothing); couples build tooling and is fragile across versions.                          |
| iframes                                | Full isolation, but breaks seamless navigation, focus management, history and responsive sizing.                                                       |

## Consequences

- The contract is small, easy to unit-test and easy to wrap later (a Web Component or a
  single-spa parcel) if requirements change.
- Two routers coexist; mitigated by a single owner of history and by contract and E2E tests
  for cross-app navigation.
- CSS leakage between apps is possible without Shadow DOM; mitigated by CSS Modules, Vue scoped
  styles and avoiding global element selectors beyond a shared reset.
- Same-origin serving requires a reverse proxy or a combined deploy (Phase 4: Rails serves the shell
  and its sections from one origin, ADR-0015; an earlier plan used Caddy).
