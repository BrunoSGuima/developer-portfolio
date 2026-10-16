# ADR-0002: Framework-agnostic mount contract for microfrontends

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

From Phase 3, sections built with Vue 3 (and possibly other frameworks) must appear inside the
React shell (ADR-0001) with seamless navigation: no full-page reloads, the shell (navigation,
mascot, Fun Fact) stays mounted, and each app remains independently developed, built and
deployed. Sub-apps also need to report events back to the shell (e.g. "data loaded") so the
mascot and Fun Fact can react.

## Decision

Each non-React section exposes a minimal, framework-agnostic ES-module contract:

```ts
interface SectionContext {
  basePath: string; // e.g. "/career"
  navigate(path: string): void; // cross-section navigation via the shell router
  emit(event: ShellEvent): void; // typed events back to the shell
}

interface SectionApp {
  mount(el: HTMLElement, ctx: SectionContext): void | Promise<void>;
  unmount(): void;
}
```

- The sub-app is built independently (Vite library mode) and served **same-origin**, e.g.
  `/apps/career/entry.js`.
- The shell route (e.g. `/career/*`) renders `<RemoteSection src=…>`, which loads the module with
  dynamic `import()`, mounts it into a stable element, and unmounts it when the route is left.
- **Routing:** the shell owns browser history and top-level routes. The sub-app handles only its
  own sub-routes under `basePath` (Vue: `createWebHistory(basePath)`) and uses `ctx.navigate` for
  cross-section links.
- **Styling:** sub-apps render in light DOM, inherit shared design tokens (CSS custom properties
  on `:root`) and use scoped styles. No Shadow DOM.
- In Phase 1 the contract type and `<RemoteSection>` host are implemented and tested with a fake
  module, but no route uses them yet.

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
- Same-origin serving requires a reverse proxy or a combined static deploy (planned: Caddy).
