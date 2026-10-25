# Roadmap

The version-controlled source of truth for the project plan. Update it whenever a step's scope or
status changes. Each step follows the collaboration rules in `CLAUDE.md`: explain → plan →
approval → implement with tests → report → the owner reviews and commits.

## Phases

| Phase | Scope                                                                                           | Status      |
| ----- | ----------------------------------------------------------------------------------------------- | ----------- |
| 1     | React + TypeScript MVP shell, static data, mascot, Fun Fact, responsive layout, en/pt-BR, tests | In progress |
| 2     | Ruby on Rails API + PostgreSQL                                                                  | Planned     |
| 3     | Vue 3 microfrontend mounted by the React shell                                                  | Planned     |
| 4     | Python FastAPI service + interactive quiz                                                       | Planned     |
| 5     | Background jobs (Redis + Sidekiq)                                                               | Planned     |
| 6     | Production deployment, CI/CD, monitoring (consider prerendering static routes)                  | Planned     |
| 7     | AI Lab and future expansion                                                                     | Planned     |

## Phase 1 steps

| #   | Step                                          | Status           | Deliverables                                                                                                                                          |
| --- | --------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Toolchain & docs skeleton                     | Done             | Node 22 (`.nvmrc`), npm workspaces, `CLAUDE.md`, `README.md`, ADR-0001/0002                                                                           |
| 1   | Scaffold shell                                | Done             | Vite react-ts, strict TypeScript, ESLint + Prettier, Vitest + RTL                                                                                     |
| 2   | Design tokens & layout                        | Done             | `tokens.css`, header/main/footer, skip link, responsive nav (ADR-0003)                                                                                |
| 3   | Section registry & routing                    | Done             | `registry.ts`, generated lazy routes, 404, `aria-current`, focus management (ADR-0004)                                                                |
| 4   | Fun Fact + TechBadge                          | Done             | Registry-driven Fun Fact, truthfulness tests                                                                                                          |
| 5   | Portfolio content                             | Done             | Home, About, Projects, Architecture, Contact from the résumé                                                                                          |
| 6   | Microfrontend host                            | Done             | `SectionApp` contract, `RemoteSection`, lifecycle tests (ADR-0002)                                                                                    |
| 7   | Mascot v0 + illustrated Home                  | Done             | State machine, approved raster art, Fun Fact stage, per-page Fun Fact placements (ADR-0005)                                                           |
| 8   | Responsive layout & screen-space optimisation | Done             | Fluid container up to 96rem, container-sized card grids, per-page layout strategies, Home composition kept intact on wide screens (ADR-0006)          |
| 9   | Internationalisation (en + pt-BR)             | Done             | Typed translations, accessible language switcher, language-specific URLs, localized metadata (ADR-0007)                                               |
| 10  | Transitions & polish                          | Done             | View Transitions for section changes (with fallback), visual polish, accessibility pass                                                               |
| 11  | Playwright E2E                                | Ready for review | `e2e/` workspace against `vite preview`, core journeys, axe scans, both languages and the language switcher, layout at key widths (320px → ultrawide) |
| 12  | Production build & CI                         | Planned          | Build verification, `ci.yml` (lint, typecheck, unit, build, e2e), "no placeholders" gate; no deploy step until a host is chosen                       |

Steps 8 and 9 were added before the original Step 8; the original Steps 8–10 are now 10–12.
Layout comes before i18n so Portuguese text expansion is checked against the final layout, and
both come before polish and E2E so those cover the finished layout in both languages.

## Phase 1 acceptance criteria

1. A static build that works with SPA fallback.
2. Sections: Home, About, Projects, Architecture, Contact, and a 404 page.
3. Navigating between sections never reloads the page; the header, Fun Fact and mascot stay
   mounted.
4. The Fun Fact text and badges come only from the registry and describe only what is
   implemented.
5. The mascot never blocks interaction, respects reduced motion, and adapts on mobile.
6. Responsive from 320px to ultrawide, with no horizontal scroll, and wide screens used
   effectively (comfortable reading widths, cards neither stretched nor cramped).
7. The site works in English (default) and Brazilian Portuguese, with the language reflected in
   the URL, persisted, and announced correctly (`lang`, titles, metadata).
8. Accessibility: skip link, landmarks, visible focus, keyboard-only navigation,
   `aria-current`, AA colour contrast, zero serious/critical axe violations.
9. `npm run lint`, `typecheck`, `test` and `test:e2e` pass locally; the CI workflow file exists.
10. `CLAUDE.md`, `README.md`, this roadmap and the ADRs are current.
11. Local Lighthouse Performance and Accessibility ≥ 90 on Home.

## Step 8 — Responsive layout & screen-space optimisation

A layout refinement, not a redesign: the visual identity, typography, colours, illustrations,
animations, content and mobile layouts are preserved.

- A fluid container (`--content-max`), identical up to 1280px and capped at 96rem.
- Card grids sized by their own container (`cardGridFit` with `--grid-min`, `--grid-cols`,
  `--grid-max`), not by viewport breakpoints alone; paragraphs keep `--measure`.
- Per-page strategies: Architecture uses up to three columns when cards stay comfortable;
  Projects cards have a maximum width; About and Contact are unchanged structurally.
- The Home composition (mascot, card, fingertip alignment) is capped at its tuned size; extra
  width becomes space between the text and the art.
- Completion requires the owner's visual review at 320 / 375 / 768 / 1024 / 1280 / 1440 / 1600 /
  1920 / 2560px; passing automated checks alone does not complete the step.

## Step 11 — Playwright E2E

- `e2e/` workspace (ADR-0009): Playwright + `@axe-core/playwright` against the production build,
  `desktop` and `mobile` projects, both languages.
- Specs: every page and the 404 with metadata and SPA fallback; navigation without reloads;
  language switching (equivalent page, history, URL authority); mobile menu; keyboard and focus;
  the mascots (walk, snap, reduced motion, never covering content, Home fingertip); layout at
  320–2560px; view transitions (crossfade, reduced motion, fallback); axe on every page; static
  files.
- Found and fixed by the suite: at desktop widths `<main>` overlaid the Fun Fact card on
  Projects and Architecture (the intro layout's subgrid) and on Home (the illustrated stage), so
  its text couldn't be selected. The Fun Fact's row now stacks above `<main>` there (z-index
  only; layouts unchanged, verified in Chromium).
- Completion requires the owner's review of the report.

## Step 10 — Transitions & polish

- **Page transitions** (ADR-0008): React Router's `viewTransition` on every internal navigation
  (including the language switcher, back/forward and remote apps). A subtle crossfade of the
  region between the header and the footer only (no movement); the header and its walking
  mascot stay still and mounted. Instant under `prefers-reduced-motion` and in browsers without
  the View Transitions API.
- **Polish:** a favicon cropped from the approved mascot art (`npm run favicon -w apps/shell`)
  and a `theme-color`; the error page's Reload uses the site's button style; the mobile menu
  panel fades in; the current language stays visible in forced-colours mode; a `robots.txt`.
- **Accessibility pass:** axe-core (WCAG 2.0–2.2 A/AA + best practices) on every page in both
  languages at 375/768/1280px (incl. the open menu), keyboard walkthroughs, forced colours,
  reduced motion, text spacing (WCAG 1.4.12) and reflow; Lighthouse on Home.
- Completed after the owner's review of the recordings, screenshots and results.

## Step 9 — Internationalisation (en + pt-BR)

- English is the default; Brazilian Portuguese is added.
- **Decision: language-specific URLs (option A).** English stays unprefixed (`/projects`);
  Portuguese lives under `/pt-br/` (`/pt-br/projects`). Links carry their language, and each
  language can be indexed with `hreflang` alternates (fully effective once routes are
  prerendered in Phase 6).
- Switching language keeps the visitor on the **equivalent page** (for example `/projects` ↔
  `/pt-br/projects`), never redirecting to Home.
- An accessible language switcher in the navigation (keyboard and screen-reader friendly, each
  option marked with its `lang`); switching does not reload the application.
- **Decision (owner): the URL is fully authoritative.** `/` is always English and `/pt-br` always
  Portuguese: no redirects, no stored preference, no browser-language detection. The language
  persists across navigation, refreshes and shared links because it is part of the URL.
- All user-facing text is translated: navigation, headings, descriptions, projects,
  architecture content, Fun Facts, status labels, buttons and accessibility labels. No
  hardcoded strings scattered across components; per-locale typed content with identical
  shapes, completeness enforced by types and tests.
- **Decision: no i18n library**: a small typed in-house layer (dictionaries typed against
  English, `Localized` content fields); see ADR-0007.
- Integrates with the section registry, generated routes, lazy loading and the microfrontend
  contract (`SectionContext` gains `locale`; a language switch remounts the app, so no change
  notification is needed; ADR-0002 update).
- Completed after the owner's review of the Portuguese text and of the layouts in both
  languages.
- `<html lang>`, titles and metadata follow the active language; layouts handle Portuguese text
  expansion.
- Tests: switching, persistence, equivalent-page links, translation completeness, navigation in
  both languages, switcher accessibility.
