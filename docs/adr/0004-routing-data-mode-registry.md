# ADR-0004: Routing with React Router data mode, generated from the section registry

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The shell (ADR-0001) must switch sections without full-page reloads while the header, navigation,
Fun Fact and mascot stay mounted. Sections are described once in a registry
(`apps/shell/src/sections/registry.ts`), which also drives the navigation and, later, the Fun
Fact. We need: scroll handling on navigation, failures that stay inside the shell, per-section
code splitting, a way for the shell to know which section is active, and room for the Vue
microfrontend (ADR-0002) and API-backed sections in later phases.

## Decision

- **React Router 8** (`react-router`; `RouterProvider` from `react-router/dom`) in **data mode**
  (`createBrowserRouter` with route objects).
- Routes are **generated** by `buildRoutes(sections)` (`apps/shell/src/app/routes.tsx`):
  - `RootLayout` (the persistent shell) is the top layout route.
  - A pathless child route has the `errorElement`, so 404s and load failures render inside the
    shell.
  - Each live section becomes a route with `lazy` (one chunk per section) and
    `handle: { section }`.
  - `*` renders the not-found page (`handle: { notFound: true }`).
  - Since Step 9 (ADR-0007) the section routes and the 404 are generated once per language:
    under `/` (English) and under `/pt-br` (Portuguese). Registry paths stay language-neutral.
- The shell reads route metadata via `useMatches()` + `handle` (document title now; the Fun Fact
  in Step 4).
- `<ScrollRestoration>` handles scroll; `useRouteFocus` moves focus to the new page's `<h1>` after
  client-side navigation.
- Document titles use React 19's built-in `<title>` hoisting.

## Alternatives considered

| Option                                            | Why not                                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| React Router declarative mode (`<BrowserRouter>`) | No `ScrollRestoration`, route error elements, `route.lazy`, `handle`/`useMatches`, `viewTransition` or loaders. |
| TanStack Router                                   | Excellent type safety, but a steeper learning curve and less common; not needed at this size.                   |
| wouter / hand-rolled router                       | Smaller, but we would rebuild scroll, focus, error and code-splitting handling.                                 |
| `React.lazy` + `<Suspense>`                       | Loading fallbacks flash mid-navigation; not integrated with router errors.                                      |
| `useEffect` / react-helmet for titles             | More code or an extra dependency for what React 19 does natively.                                               |

**Section loaders (Phase 3, Step 3.3):** a section may declare a `loader` in the registry;
`buildRoutes()` attaches it to the section's route in every language, next to the lazy page.
The Projects loader (`src/projects/source.ts`) returns its data unawaited in a full-stack build,
so navigation completes at once and the page renders loading, error and retry states itself.

## Consequences

- Adding a section = one registry entry + one page component; routes, nav and tests follow.
- React Router adds ~32 kB gzipped to the main bundle (69.5 → 101 kB).
- Routes are objects rather than JSX, and a few data-router concepts (`lazy`, `handle`,
  `errorElement`) must be understood.
- Static hosts must serve `index.html` for unknown paths (SPA fallback). Unknown URLs then
  return HTTP 200 with an in-app "Page not found" (a soft 404); revisit for SEO in the deployment phase (Phase 4).
- Phase 2 can fetch Rails data with route loaders; Phase 5 can mount the Vue app on a
  `/career/*` route.
