# ADR-0008: Page transitions with the View Transitions API

- **Status:** Accepted (Phase 1, Step 10)
- **Date:** 2026-10-20

## Context

Sections swapped instantly. Step 10 adds transitions between sections, with requirements: keep
the persistent shell (header, walking nav mascot, Fun Fact) visually stable and mounted (ADR-0001,
ADR-0005), no flicker or animation restarts, both languages (ADR-0007), respect
`prefers-reduced-motion`, a clean fallback where unsupported, no new dependency, and no change to
the approved layouts.

## Decision

1. **React Router's built-in `viewTransition`** on every internal navigation: the nav links, the
   brand link, `ButtonLink`, the inline links (Projects → About, Home → Architecture, 404 →
   home), the language switcher, and a remote app's `ctx.navigate()` (the shell calls
   `navigate()` with the `viewTransition` option). React Router wraps the update in
   `document.startViewTransition()`,
   remembers which navigations used it (so **back/forward** transition too), and falls back to
   an instant update where the API is missing.
2. **What animates:** only the page region between the header and the footer
   (`view-transition-name: page` on AppLayout's region: the Fun Fact, `<main>` and the Home
   backdrop). The root (header with its walking mascot, footer) has no animation, so it stays
   live and still.
3. **Effect:** a subtle crossfade, no movement: the old page fades out over `--duration-fast`
   (150ms) while the new one fades in over `--duration-base` (250ms), `--ease-out`. The Fun
   Fact's own fade-in is skipped while a transition is active (`:active-view-transition`), so
   it never fades twice; browsers without view transitions keep it.
4. **Reduced motion:** the duration tokens are 0ms and an explicit rule removes every
   `::view-transition-*` animation: navigation is instant.
5. Focus management (`useRouteFocus`), scroll restoration and `preventScrollReset` on the
   language switcher are unchanged.

## Alternatives considered

| Option                                        | Why not                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| React's `<ViewTransition>` component          | Still experimental in React 19.                                                                   |
| Custom CSS/JS enter-exit animations           | Duplicates what the router and browser already do (incl. back/forward); needs both pages mounted. |
| A motion library                              | A dependency for one crossfade.                                                                   |
| Animating the whole document (default `root`) | The header and the walking mascot would crossfade on every navigation.                            |

## Consequences

- Supported browsers (Chrome/Edge 111+, Safari 18+, Firefox 144+) crossfade; others behave as
  before. Nothing depends on the animation.
- During the ~250ms transition the page is a snapshot: clicks wait for it to finish; a new
  navigation restarts the transition.
- New internal links must pass `viewTransition` (CLAUDE.md); new motion uses the duration
  tokens so reduced motion stays automatic.
- Tests: a browser-router test stubs `document.startViewTransition` and checks every call site,
  back/forward, the fallback and that the shell is not remounted; stylesheet tests pin the CSS.
  Chromium verification confirmed the animations (150/250ms, none on the root, none with
  reduced motion) and that the header, Fun Fact and nav mascot stay the same DOM nodes.
