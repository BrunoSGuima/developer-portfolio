# Roadmap

The version-controlled source of truth for the project plan. Update it whenever a step's scope or
status changes. Each step follows the collaboration rules in `CLAUDE.md`: explain → plan →
approval → implement with tests → report → the owner reviews and commits.

## Phases

**Deployment strategy (decided 2026-10-24):** the portfolio is not deployed yet. The first public
release waits until the Ruby on Rails API and PostgreSQL are integrated with the shell and the
whole stack is validated. Until then, quality is guarded by CI (Step 12, ADR-0010). The phases
after Phase 1 were renumbered accordingly; the earlier plan had deployment as Phase 6.

**Owner's decisions (2026-10-25):**

- Deployment stays postponed until the Rails API, PostgreSQL and the frontend/backend
  integration are complete (Phases 2–3).
- The placement of Phases 5–8 (Vue, FastAPI, background jobs, AI Lab) after deployment is
  **provisional**; it will be revisited during backend planning.
- CI keeps the strict content check (any `todo()` placeholder fails the build).
- Dependabot for the pinned GitHub Actions is deferred.
- Branch protection for `main` is configured once the workflow is confirmed green on GitHub.

**Phase 1 (React frontend foundation) is done:** CI ran green on GitHub for the Step 12 commit
(`f15f91c`, 2026-10-25). The Architecture page update that followed is done too (`e0e22df`).

**Phase 2 is in progress** (Step 2.0, planning and documentation; approved 2026-10-25).

| Phase | Scope                                                                                                                                                                 | Status                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1     | **React frontend foundation**: React + TypeScript shell, static data, mascot, Fun Fact, responsive layout, en/pt-BR, unit + E2E tests, CI                             | Done                          |
| 2     | Ruby on Rails API + PostgreSQL: projects and contact messages, security, RSpec + FactoryBot, OpenAPI contract, its own CI job; works and is tested on its own         | In progress                   |
| 3     | Frontend/backend integration, full-stack validation and **MVP completion**: the shell reads projects and sends contact messages through the API, full-stack E2E in CI | Planned                       |
| 4     | Production deployment (first public release): host and reverse proxy, CD, monitoring, prerendering/SEO                                                                | Planned (postponed until 2–3) |
| 5     | Vue 3 microfrontend mounted by the React shell (order of 5–8 provisional)                                                                                             | Planned                       |
| 6     | Python FastAPI service + interactive quiz                                                                                                                             | Planned                       |
| 7     | Background jobs (Redis + Sidekiq)                                                                                                                                     | Planned                       |
| 8     | AI Lab and future expansion                                                                                                                                           | Planned                       |

## MVP definition

Phase 1 is the **React frontend foundation**, not the MVP. The **MVP is complete only at the end
of Phase 3**: the frontend foundation, the Rails API with PostgreSQL, and their integration,
validated end to end (decided 2026-10-25).

- **Phase 2** is complete when the Rails API, PostgreSQL persistence, the endpoints, the security
  measures and the RSpec suite work and pass **on their own**, locally and in CI. It never depends
  on Phase 3.
- **Phase 3** integrates the shell with the API, validates the full stack and completes the MVP.
- **Phase 4** deploys it.

## Phase 1 steps

| #   | Step                                          | Status | Deliverables                                                                                                                                                             |
| --- | --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | Toolchain & docs skeleton                     | Done   | Node 22 (`.nvmrc`), npm workspaces, `CLAUDE.md`, `README.md`, ADR-0001/0002                                                                                              |
| 1   | Scaffold shell                                | Done   | Vite react-ts, strict TypeScript, ESLint + Prettier, Vitest + RTL                                                                                                        |
| 2   | Design tokens & layout                        | Done   | `tokens.css`, header/main/footer, skip link, responsive nav (ADR-0003)                                                                                                   |
| 3   | Section registry & routing                    | Done   | `registry.ts`, generated lazy routes, 404, `aria-current`, focus management (ADR-0004)                                                                                   |
| 4   | Fun Fact + TechBadge                          | Done   | Registry-driven Fun Fact, truthfulness tests                                                                                                                             |
| 5   | Portfolio content                             | Done   | Home, About, Projects, Architecture, Contact from the résumé                                                                                                             |
| 6   | Microfrontend host                            | Done   | `SectionApp` contract, `RemoteSection`, lifecycle tests (ADR-0002)                                                                                                       |
| 7   | Mascot v0 + illustrated Home                  | Done   | State machine, approved raster art, Fun Fact stage, per-page Fun Fact placements (ADR-0005)                                                                              |
| 8   | Responsive layout & screen-space optimisation | Done   | Fluid container up to 96rem, container-sized card grids, per-page layout strategies, Home composition kept intact on wide screens (ADR-0006)                             |
| 9   | Internationalisation (en + pt-BR)             | Done   | Typed translations, accessible language switcher, language-specific URLs, localized metadata (ADR-0007)                                                                  |
| 10  | Transitions & polish                          | Done   | View Transitions for section changes (with fallback), visual polish, accessibility pass                                                                                  |
| 11  | Playwright E2E                                | Done   | `e2e/` workspace against `vite preview`, core journeys, axe scans, both languages and the language switcher, layout at key widths (320px → ultrawide)                    |
| 12  | CI & automated quality checks                 | Done   | GitHub Actions `ci.yml` on pushes to main and pull requests: format, lint, types, unit tests, content gate, build, Playwright E2E + axe (ADR-0010); deployment postponed |

Steps 8 and 9 were added before the original Step 8; the original Steps 8–10 are now 10–12.
Layout comes before i18n so Portuguese text expansion is checked against the final layout, and
both come before polish and E2E so those cover the finished layout in both languages.

## Phase 1 (frontend foundation) acceptance criteria

1. A static production build that works with SPA fallback (verified by the E2E suite against
   `vite preview`; deployment is postponed to Phase 4).
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
9. `npm run lint`, `typecheck`, `test` and `test:e2e` pass locally and in CI (GitHub Actions).
10. `CLAUDE.md`, `README.md`, this roadmap and the ADRs are current.
11. Local Lighthouse Performance and Accessibility ≥ 90 on Home.

## Phase 2 — Ruby on Rails API + PostgreSQL

**Owner's decisions (2026-10-25):**

1. Scope: a **Projects API** (read-only, bilingual) and **Contact messages** (validated,
   persisted, protected against abuse). Profile, experience and the Architecture content stay
   static.
2. Localised text: **JSONB** `{ "en", "pt-BR" }` fields with model validations and database
   check constraints (ADR-0012).
3. Contact notifications: not in Phase 2 (messages are read with a rake task); a practical
   notification or retrieval solution must be defined **before public deployment**.
4. Retention of contact messages: **12 months**, reviewed before deployment (ADR-0013).
5. API documentation: a handwritten **OpenAPI** document with contract validation in the
   request specs (ADR-0012).
6. Development: **native Ruby**, PostgreSQL in **Docker Compose** (ADR-0011).
7. Versions: exact Ruby, Rails and PostgreSQL releases are **not decided yet**; Step 2.1 verifies
   stable releases, compatibility and tooling support before choosing them.

Also required: same-origin API (no CORS), the backend testable on its own, no unnecessary gems
or premature abstractions, spam protection and privacy safeguards on the contact endpoint, the
rate limiter's limitations documented before deployment, and an explicit contract (the OpenAPI
document) instead of Rails tests reading TypeScript files. Redis, Sidekiq, Vue and FastAPI stay
out of Phase 2.

| #   | Step                       | Status      | Depends on |
| --- | -------------------------- | ----------- | ---------- |
| 2.0 | Terminology and ADRs       | In progress | —          |
| 2.1 | Toolchain and API skeleton | Planned     | 2.0        |
| 2.2 | CI `api` job               | Planned     | 2.1        |
| 2.3 | Projects domain            | Planned     | 2.1        |
| 2.4 | Projects API               | Planned     | 2.3        |
| 2.5 | Contact messages           | Planned     | 2.4        |
| 2.6 | Hardening and docs         | Planned     | 2.5        |

Each step follows the collaboration rules (plan → approval → implementation with tests →
review); none starts automatically.

### Step 2.0 — Terminology and ADRs

- **Goal:** correct the MVP terminology and record the Phase 2 architecture before any code.
- **Files:** this roadmap, `CLAUDE.md`, `README.md`, ADR-0001 (terminology note), new
  ADR-0011/0012/0013, the Architecture timeline (`content/architecture.ts`: v1 "React frontend
  foundation", v2 in progress, v3 "Frontend/backend integration (MVP)") and its tests.
- **Acceptance:** documents consistent; format, lint, typecheck, unit, content, build and E2E
  pass. No backend code, Docker files or CI changes.

### Step 2.1 — Toolchain and API skeleton

- **Goal:** a runnable, empty Rails API next to the shell.
- **Decisions:** verify and pin Ruby (`.ruby-version`), Rails and PostgreSQL versions (official
  release notes, mutual compatibility, `ruby/setup-ruby` and Docker image support);
  `rails new services/api --api --database=postgresql` without unused frameworks (Action
  Mailbox/Text/Cable, Active Storage, Kamal, Minitest, Rails' own CI file); keep RuboCop
  (rails-omakase) and Brakeman.
- **Files:** `services/api/**`, `infra/compose.yaml` (PostgreSQL only: named volume,
  healthcheck), `services/api/.env.example`, `.gitignore`.
- **Tests:** RSpec + FactoryBot installed; a request spec for `GET /up`.
- **Acceptance:** `bin/rails db:prepare` against Compose; specs, RuboCop and Brakeman pass; the
  timeline's v2 stays "In progress"; setup documented.

### Step 2.2 — CI `api` job

- **Goal:** the API is checked on every push and pull request, independently of the shell.
- **Decisions:** a third job in `ci.yml` with a PostgreSQL service container, `ruby/setup-ruby`
  pinned by SHA (bundler cache), same security rules as ADR-0010; steps RuboCop → Brakeman →
  bundler-audit → `db:prepare` → RSpec.
- **Acceptance:** actionlint clean; clean-copy rehearsal; green on GitHub; ADR-0010 updated.

### Step 2.3 — Projects domain

- **Goal:** projects stored in PostgreSQL with bilingual text.
- **Files:** migrations, `Project` and `ProjectLink` models, the localised-text validator,
  factories, seeds with the current site's projects (en + pt-BR).
- **Decisions:** JSONB localised fields with check constraints (both languages, non-blank);
  unique `slug`; `status` limited to the site's status words; https-only links; technology ids
  from an allowed list (documented as an OpenAPI enum).
- **Tests:** model specs for validations and specs proving the database constraints reject bad
  rows; seeds load.

### Step 2.4 — Projects API

- **Goal:** `GET /api/v1/projects` (published, ordered) and `GET /api/v1/projects/:slug`.
- **Files:** a base API controller with consistent error handling, small plain-Ruby serializers,
  `services/api/docs/openapi.yaml`, request specs.
- **Decisions:** `{ "data": … }` responses, `{ "error": { code, message, details } }` errors,
  snake_case keys; every response validated against OpenAPI with `committee`.
- **Tests:** 200, 404, unpublished hidden, order, both languages present, contract validation.

### Step 2.5 — Contact messages

- **Goal:** `POST /api/v1/contact_messages` with validation, persistence and abuse protection.
- **Decisions (ADR-0013):** minimal fields (name, email, message, locale); no IP stored;
  personal fields filtered from logs; a honeypot (fake success, nothing stored); Rails
  `rate_limit`; rake tasks to list messages and purge those older than 12 months.
- **Tests:** 201, 422 with per-field details, 429, honeypot not stored, request-size limits,
  model and task specs, contract validation.

### Step 2.6 — Hardening and docs

- **Goal:** close Phase 2.
- **Work:** bundler-audit clean, parameter-filter review, the API README (setup, commands,
  endpoints), ADRs completed (versions recorded in ADR-0011), the rate limiter's limitations
  documented.

### Phase 2 acceptance criteria

Independent of Phase 3: the shell is not required.

1. The API runs locally (native Ruby) against PostgreSQL in Docker Compose, from documented
   setup steps.
2. Projects and contact-message endpoints behave as specified in the OpenAPI document, and
   every request spec validates against it.
3. Model, constraint, request and task specs pass; RuboCop, Brakeman and bundler-audit are
   clean; all of it in CI on GitHub.
4. Contact endpoint: validation, rate limiting, honeypot, filtered logs, no IP stored,
   retention task.
5. ADR-0011 to 0013, this roadmap, `CLAUDE.md` and the API README are current.

When they are met, the Architecture timeline's v2 becomes **Done**.

## Phase 3 — Integration and MVP completion (summary)

The shell reads projects through route loaders (loading and error states in both languages),
`/api` is proxied same-origin (Vite dev server and preview), an accessible contact form with a
privacy note, Fun Facts / registry `backend: 'rails'` / Architecture page updated truthfully,
the frontend's types and fixtures checked against the OpenAPI document, and full-stack E2E in
CI. Completing it completes the **MVP**. Detailed planning happens after Phase 2.

## Before public deployment (Phase 4 gates)

- A practical notification or message-retrieval solution for contact messages.
- The 12-month retention period reviewed.
- Rate limiting backed by a store shared by all API processes, with correct client IPs behind
  the reverse proxy (ADR-0013 lists the current limitations).
- The privacy note published with the contact form.

## Step 12 — CI & automated quality checks

- Scope changed from "Production build & CI": **no deployment, hosting or production
  infrastructure** (postponed to Phase 4, after the backend and database are integrated).
- `.github/workflows/ci.yml` (ADR-0010) runs on pushes to `main` and on pull requests, with a
  read-only token, actions pinned to commit SHAs, npm and browser caching, and two parallel jobs:
  - **quality:** `npm ci`, format check, lint, typecheck, unit tests, the content gate
    (`npm run content:check`: no `todo()` placeholders) and the production build;
  - **e2e:** Playwright + axe against the production build (Chromium with its system libraries),
    uploading the HTML report as an artifact.
- Validated locally: actionlint + shellcheck, and both jobs rehearsed in a clean copy with
  `CI=true`. A flaky pixel-contrast test found that way was fixed (the screenshot could capture
  the frame before the hidden text was painted).
- Approved by the owner (2026-10-25). The first green run on GitHub confirms acceptance
  criterion #9; branch protection for `main` (requiring both jobs) is configured after that.

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
- Completed after the owner's review of the report.

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
  prerendered in the deployment phase, Phase 4).
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
