# ADR-0009: End-to-end testing with Playwright and axe

- **Status:** Accepted (Phase 1, Step 11)
- **Date:** 2026-10-20

## Context

Unit and component tests (Vitest, jsdom) cover logic, routing and markup, but jsdom has no
layout, media queries, view transitions or real focus rendering. Earlier steps verified those
by hand in Chromium (Steps 8–10) and several ADRs promised automated browser checks: the
mascot's geometry and that it never covers content (ADR-0005), the layout at key widths
(ADR-0006), deep links and the SPA fallback in both languages (ADR-0007), and the page
transitions (ADR-0008). Accessibility must stay at zero axe violations (Step 10 baseline).

## Decision

1. **Playwright Test** in the `e2e/` npm workspace, running against the **production build**:
   its `webServer` builds the shell and serves it with `vite preview` (SPA fallback, like the
   production host). Two projects: `desktop` (Chromium, 1280×800, real scrollbars) and
   `mobile` (Pixel 7 emulation, touch). Chromium only for now; Firefox/WebKit can be added in
   CI (Step 12).
2. **`@axe-core/playwright`** for accessibility: WCAG 2.0–2.2 A/AA plus best practices, on every
   page and the 404 in both languages, desktop and mobile, plus the open mobile menu. **Any**
   violation fails (stricter than "serious/critical"). Text over the illustration, which axe
   can only mark "needs review", gets a pixel contrast check (≥ 4.5:1).
3. **Expectations come from the app**: the specs import the languages, dictionaries and the
   section registry from `apps/shell/src` (pure modules), so they cover every language and
   section automatically and never duplicate copy.
4. **Determinism**: reduced motion by default (the transition and mascot specs opt out),
   web-first assertions and `expect.poll` instead of sleeps, role/label queries; data attributes
   only where no accessible handle exists (`data-fun-fact`, `data-mascot`, `data-nav`).
   Geometric invariants with small tolerances instead of screenshot comparisons.
5. **Known bugs are visible, not hidden**: a test that exposes an app bug awaiting a fix is
   marked `test.fail()` with the reason; Playwright flags it as soon as the bug is fixed.
6. CI-ready: with `CI` set, retries 2, `forbidOnly`, one worker, GitHub + HTML reporters.

Specs: `pages`, `navigation`, `language`, `mobile-menu`, `keyboard`, `mascot`, `layout`,
`transitions`, `accessibility`, `assets` (see `e2e/tests/`).

## Alternatives considered

| Option                 | Why not                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Cypress                | Heavier, no real `prefers-*`/forced-colours emulation, no WebKit, weaker multi-page handling. |
| Vitest browser mode    | Suited to components; we need whole-app journeys against the production build.                |
| Screenshot comparisons | Brittle across fonts, GPUs and OSes; geometric assertions state the actual intent.            |
| Hand-injected axe-core | The official `@axe-core/playwright` wrapper is maintained and simpler.                        |

## Consequences

- `npm run test:e2e` builds, serves and tests everything (about 45 s locally); the unit suite
  (`npm test`) stays fast and separate.
- Browsers are a one-time setup: `npx playwright install chromium`, and on Linux/WSL the system
  libraries with `sudo npx playwright install-deps chromium`.
- Mutation checks during Step 11 confirmed the suite catches: links without `viewTransition`,
  content wider than the viewport (including content clipped by `overflow-x: clip`), an
  untranslated heading, and an unnamed control.
- The e2e workspace type-checks the shell's pages too (it imports the registry), so both must
  keep compatible strict settings.
