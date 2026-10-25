# CLAUDE.md

Guidance for working in this repository. Keep it current: update it whenever architecture,
conventions or commands change.

## Project

Interactive developer portfolio for Bruno (Software Engineer, Rails background, expanding into
Python, frontend engineering, distributed systems and AI engineering). It looks like one website
but is powered by several independently developed applications. The site is in English.

## Current phase

**Phase 1 — React frontend foundation: done** (Steps 0–12: toolchain, shell scaffold, design
tokens, registry & routing, Fun Fact, portfolio content, microfrontend host, mascot and
illustrated Home, responsive layout, i18n en + pt-BR, transitions & polish, Playwright E2E, CI;
CI is green on GitHub; Architecture page updated). Phase 1 is **not** the MVP.

**Phase 2 — Ruby on Rails API + PostgreSQL: in progress** (Steps 2.0–2.1 done: ADRs, the API
toolchain and skeleton in `services/api`; Step 2.2, the CI `api` job, ready for review).
Phase 2 is complete when the API, persistence, endpoints, security and RSpec suite work on their
own (no frontend required). **The MVP is complete only at the end of Phase 3** (integration and
full-stack validation). **Deployment is postponed** to Phase 4; do not add hosting, CD or
production infrastructure before it. The roadmap, step list, acceptance criteria and recorded
decisions live in **`docs/ROADMAP.md`** (version-controlled source of truth; keep it current).

The API runs Ruby 4.0.9, Rails 8.1.4 and PostgreSQL 18.6 (ADR-0011). Do not add Python, Redis, Sidekiq or Vue until their phase. The shell keeps its
static data until Phase 3.

## Architecture

- **Shell** (`apps/shell`, React + TypeScript + Vite): a single SPA that owns the layout, main
  navigation, router, Fun Fact banner, mascot layer, page transitions and global UI state. It
  stays mounted while sections change. See ADR-0001.
- **Section registry** (`apps/shell/src/sections/registry.ts`): single source of truth for every
  section (`id`, language-neutral `path`, `label`, `title`, `description`, `framework`, `backend`,
  `status`, `mount`, `funFact`; the text fields are `Localized`).
  Only `live` sections get routes and nav links. Badge labels/tones live in
  `sections/technologies.ts` (`TechId` is derived from its keys).
- **Fun Fact** (`components/FunFact`): persistent `<aside data-fun-fact>` (labelled "Fun fact" /
  "Curiosidade") in the context row,
  fed by `useCurrentSection()` in `RootLayout`; `shellFunFact` is shown when no section matches.
  No `aria-live` (focus moves to the page `<h1>` on navigation instead).
- **Routing** (ADR-0004): React Router 8 in data mode. `buildRoutes(sections)`
  (`apps/shell/src/app/routes.tsx`) generates the tree: `RootLayout` (persistent shell) → a
  pathless error route → per language (`/` English, `/pt-br` Portuguese) one lazy route per
  section (`handle: { section }`) + `*` 404 (`handle: { notFound: true }`). Import from
  `react-router`; `RouterProvider` from `react-router/dom`. Use `Link`/`NavLink`, never plain
  `<a href>` for internal links, and build them with `useLocalizedPath()`.
- **i18n** (ADR-0007, `apps/shell/src/i18n/`): English (default, unprefixed) and pt-BR (`/pt-br`).
  The URL is the only source of truth (no redirects, no stored preference). `RootLayout`
  provides the locale (`LocaleContext`); use `useLocale()`, `useMessages()`,
  `useLocalizedPath()`, `pick()` / `text()`. Interface strings live in `i18n/messages/en.ts`
  (defines the shape) and `pt-BR.ts` (typed `Messages`); content and registry prose are
  `Localized` fields beside single-sourced facts. `Metadata.tsx` renders title, description,
  canonical and hreflang; `useDocumentLang` sets `<html lang>`. The language switcher
  (`components/LanguageSwitcher`) is in the menu panel below 48rem, in the header lane above
  the brand at 48–64rem and inline from 64rem.
- **Microfrontends** (ADR-0002): non-React sections implement the contract in
  `apps/shell/src/microfrontends/contract.ts` (`mount(el, ctx) / unmount()`), are built
  independently, served same-origin (e.g. `/apps/career/entry.js`) and hosted by
  `<RemoteSection>` (route `<path>/*`). The host is implemented and tested (Step 6) with a
  plain-DOM fake app (`src/test/fakeSectionApp.ts`); **no real remote section exists yet**.
  The context carries `locale` and a language-specific `basePath`; `ctx.navigate` takes
  language-neutral paths; a language switch remounts the app (ADR-0002, ADR-0007).
  Router URL synchronisation is a known open issue for Phase 5 (see ADR-0002).
- **Backends** (Phase 2+): Rails API and FastAPI, each owning its own database and credentials
  on one PostgreSQL instance. Services never modify each other's tables; they talk via APIs.
  The Rails API (ADR-0011) lives in `services/api` (API-only, native Ruby, PostgreSQL in Docker
  Compose under `infra/`), is served same-origin under `/api` (no CORS) and is tested on its own.
  Localised data is JSONB `{ "en", "pt-BR" }`; the handwritten OpenAPI document is the contract
  between API and shell (ADR-0012). Contact messages follow ADR-0013 (privacy, abuse protection,
  12-month retention).
- **Hosting**: not deployed yet (owner's decision). The first release is Phase 4, after the Rails
  API and PostgreSQL are integrated (Phases 2–3); then a single VPS with Docker Compose behind
  Caddy, path-routed same-origin, is the current plan. No Kubernetes in the MVP.
- **CI** (ADR-0010, `.github/workflows/ci.yml`): on pushes to `main` and pull requests, three
  parallel jobs: `quality` (`npm ci`, format, lint, typecheck, unit tests, `content:check`,
  build), `e2e` (Playwright + axe, HTML report artifact) and `api` (`ruby/setup-ruby` from
  `services/api/.ruby-version` with the Bundler cache, a `postgres:18.6-trixie` service container,
  then `bin/ci`). Read-only token, actions pinned to commit SHAs (update SHA and release comment
  together), no secrets (the `api` job's database password is a documented throwaway). Keep CI
  calling root npm scripts and `bin/ci` so it never drifts from local commands: new API checks
  go into `services/api/config/ci.rb`, not the workflow. Keep the PostgreSQL image tag identical
  in `infra/compose.yaml` and the workflow; bump the setup-ruby SHA with `.ruby-version`.

## Conventions

- TypeScript `strict` mode (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Minimal dependencies. Phase 1 runtime deps: `react`, `react-dom`, `react-router` (v8), and
  `@fontsource-variable/inter` (self-hosted font). Adding a dependency requires a stated reason.
- Styling (ADR-0003): CSS Modules next to each component; global styles only in
  `apps/shell/src/styles/` (`reset.css`, `tokens.css`, `global.css`, plus the `.container`
  utility). Components use **purpose-named tokens only** (`--color-text`, `--color-accent`, ...),
  never raw palette values. Mobile first; breakpoints `40rem` / `48rem` / `64rem`.
- Muted grey (`#9d928f`) and slate (`#738297`) are decorative only; use `--color-text-muted` /
  `--color-text-slate` for text.
- Accessibility is a requirement: semantic landmarks, keyboard navigation, visible focus,
  `prefers-reduced-motion` support, AA contrast. The mascot is decorative
  (`aria-hidden`, `pointer-events: none`) and must never block content. Step 10 audit
  baseline: 0 axe violations (WCAG 2.2 AA + best practices) in both languages; keep it there.
- **Page transitions** (ADR-0008): every internal navigation passes React Router's
  `viewTransition` (links, `ButtonLink`, the language switcher, and `navigate()` calls). Only
  the region between header and footer crossfades (`view-transition-name: page`); the header
  and its walking mascot never animate. New motion must use the duration tokens
  (`--duration-fast`, `--duration-base`; 0ms under reduced motion) and never move layout.
- **Truthfulness:** the Fun Fact and Architecture page must only describe what is actually
  implemented. Planned components are marked `planned`.
- **Writing Fun Facts:** describe only what exists at the end of the current step; put future
  technologies in `plannedTech` (rendered with a visible "planned" label); when a section's
  framework differs from the shell's, say so (e.g. "built with Vue.js, mounted by the React
  shell"). `registry.test.ts` enforces that the framework badge is present and that live backend
  badges match `backend`.
- **When a section's content changes, re-check its Fun Fact** in the same step.
- **Languages:** no hardcoded user-facing strings in components (including `aria-label`s and
  titles). Interface strings go into **both** `i18n/messages/en.ts` and `pt-BR.ts`; content and
  registry prose are `Localized` fields (facts such as dates, links and statuses stay
  single-sourced). Translations must sound natural, keep the facts identical, and leave
  proper nouns and official course names untranslated. Never select elements by translated
  text: use data attributes. `i18n/completeness.test.ts` enforces matching keys, non-empty
  values and no untranslated copies (allowlist for words identical in both).
- **Content** lives as typed data in `apps/shell/src/content/` (shaped like the future Rails
  models); pages render it. The owner's résumé is the source of truth: **never invent**
  experience, metrics, achievements or projects; no confidential employer/client details; private
  professional work is not a portfolio project; Python and AI engineering are presented only as
  areas of ongoing development. **Never publish a phone number** (`privacy.test.ts` rejects
  phone-like text using a generic pattern; never write the real number into the repo, tests
  included). Résumé PDFs are git-ignored, except the public phone-free copy
  `apps/shell/public/Bruno_Guimaraes_Resume.pdf` (explicit `.gitignore` exception). Before
  replacing it, check the new PDF's text **and metadata** for a phone number.
- **Placeholders:** unconfirmed copy is `todo('…')` (renders a "To confirm" chip, never a link).
  `npm run content:todo` lists pending ones; CI fails on any (`npm run content:check`).
- **Mascot** (ADR-0005, `apps/shell/src/mascot/`): decorative only (`aria-hidden`,
  `pointer-events: none`, never focusable, never covers content). A pure state machine
  (`machine.ts`) plus CSS transitions. **Two independent instances**, sharing only the art:
  the navigation mascot (`HeaderMascot`, ≥ 48rem, placeholder SVG) walks above the menu only
  when the **active section** changes; the stationary Fun Fact mascot (`FunFactStage` +
  `FunFactMascot`, all widths) uses the **approved raster illustrations**: it presents the card
  in the Home hero (`docs/assets/homepage.png`) and peeks over it elsewhere, with its fingertips
  drawn in front of the card (`docs/assets/funfact.png`). The card is always the top layer.
  Never redraw approved art with SVG/CSS shapes.
- **Home hero:** the shell renders one full-bleed backdrop (`HomeBackdrop`: A1/A2 + scrim)
  behind the Fun Fact and the page hero; `useHeroExtent` sizes it to the real hero
  (`[data-slot="hero"]`). HomePage and the stage share `--home-hero-text-ratio` and
  `--home-stage-height`; change them together. Hero text uses `--color-text` (the muted grey
  fails contrast over artwork; measured ≥ 4.9:1 with the scrim). From 64rem the hero and "What
  I do" share one grid (`.top` in `HomePage.module.css`): hero, then the heading (a flexible
  row), then the cards; the section is a subgrid and a spacer spanning rows 1–2
  (`--home-stage-height` + `--space-3`) keeps the cards below the stage. The presenting mascot's
  height and left offset are tied to `--home-stage-height` so its fingertip stays under the card
  (see the comment in `FunFactStage.module.css`); change them together. The stage is a grid
  with a minimum height: a taller Fun Fact card (narrow widths, Portuguese) pushes the mascot
  down instead of covering its fingertip, and the spacer follows (`--home-stage-block`). No fixed hero height:
  if the hero wraps, the heading and cards move down. The stage extends right by
  `--home-stage-shift` (up to 4rem of the free space beside the container, always leaving
  `--space-4`; measured in `cqi` against the hero region, an inline-size container).
- **Page layout:** `AppLayout` wraps the Fun Fact row and `<main>` in one centred `.columns`
  container. A section's optional `contextPlacement` (registry) chooses `'stacked'` (default:
  Fun Fact above the content), `'aside'` (from 64rem: content left, Fun Fact in a
  `--aside-width` right column) or `'intro'` (from 64rem: the page's intro left with the Fun
  Fact beside it, the body full width below both; `<main>` is a subgrid). `'intro'` pages
  render `components/PageIntro` (`title`, `lead`, optional `column`, body as children), which
  provides the `page-intro` / `page-body` slots; `column` content stays in the left column
  beside the Fun Fact (Architecture puts "How it's built today" there, like About's layout),
  and the body is full width for later sections and diagrams. For cards, use
  `page.cardGridFit` (container-sized, `auto-fill`; tune per list with `--grid-min`,
  `--grid-cols`, `--grid-max`, `--grid-gap`) and `page.cardCompact`.
  Everything starts at `--page-top-space` below the navbar. Currently `'aside'`: About and
  Contact; `'intro'`: Projects and Architecture. Home is always stacked.
- **Responsive layout** (ADR-0006): `--content-max` is fluid (72rem up to a 1280px viewport,
  at most 96rem); paragraphs keep `--measure`. Wider screens add columns, not longer lines.
  Prefer container-sized grids over new viewport breakpoints. The Home stage and hero text
  column are capped at their 72rem sizes (`--home-stage-max`, `--home-hero-text-max`) so the
  tuned composition never drifts; from 64rem the Fun Fact card is placed from the third "What I
  do" card (`--home-card-width`, tied to that grid's gap and the container formula), then the
  whole stage is nudged left by `--home-stage-nudge` (2.5rem) for visual balance; between
  64rem and 80rem the stage flows (mascot below the card) and the spacer follows its measured
  height (`--home-stage-block`, set by `useHeroExtent`). Page
  intros (`page.lead`) share `--measure-lead` (75ch); body text keeps `--measure` (65ch). Verify layout changes in a real browser (jsdom can't lay out).
- **Illustrations:** sources in `docs/assets/source/` are never modified. `npm run illustrations
-w apps/shell` (dev dependency `sharp`) writes WebP derivatives + `manifest.json` to
  `apps/shell/src/assets/illustrations/` (committed). Components read dimensions from the
  manifest. See `docs/assets/ART-BRIEF.md` §8.
- **Final mascot art:** add the new art components (same props, drawn facing right) and point
  `mascotAssets` in `mascot/assets.ts` at them; set `isPlaceholderArt = false` and update the
  Architecture "Mascot guide" wording. Nothing else changes.
- Significant decisions get an ADR in `docs/adr/` (copy `0000-template.md`).
- No secrets in the repo. `.env*` files are git-ignored (except `.env.example`).

### Adding a remote (microfrontend) section

Use `mount: remoteMount('/apps/<id>/entry.js')` in the registry entry, with a truthful
`framework` and a Fun Fact that says it is mounted by the React shell. The entry must be a
same-origin path and the section cannot be `/`. Resolve ADR-0002's router-synchronisation issue
before the app uses its own router.

### Adding a section

1. Create the page component: `apps/shell/src/sections/<id>/<Name>Page.tsx` (default export,
   exactly one `<h1>`).
2. Add an entry to `sections` in `registry.ts` with truthful `framework` / `backend` / `status`
   and a `funFact` (add any new technology to `technologies.ts`).
3. That's it: the route, nav link, document title, Fun Fact and the parameterised tests pick it
   up.

## Testing

- React: Vitest + React Testing Library (query by role/label, not implementation details).
  `window.matchMedia` is mocked in `src/test/media.ts` (default: desktop, motion allowed; use
  `setMedia()`). Mascot tests stub `getBoundingClientRect` and use fake `setTimeout` only.
  Route-level tests use `renderRoute(path)` (`apps/shell/src/test/renderRoute.tsx`), which renders
  the real route tree in a memory router; components using `Link`/`NavLink` need a
  `MemoryRouter` wrapper. jsdom has no media queries, so the nav renders collapsed (mobile) and
  the language switcher is reached through the Menu panel. Portuguese routes are tested with
  `renderRoute('/pt-br/...')`; test fixtures use `same()` (`src/test/localized.ts`). Layout is
  verified in Chromium in both languages (jsdom can't lay out).
- Vue (Phase 5): Vitest + Vue Test Utils.
- Rails (Phase 2): RSpec + FactoryBot (model, constraint, request and rake task specs);
  transactional isolation; request specs validate responses against the OpenAPI document. Rails
  tests never read the shell's TypeScript files.
- Python (Phase 6): Pytest + HTTPX.
- End-to-end (ADR-0009, `e2e/`): Playwright against the production build (`vite preview`),
  projects `desktop` (real scrollbars) and `mobile`, with `@axe-core/playwright` (any
  violation fails). Specs import languages, dictionaries and the registry from the shell, so
  expectations follow the app; reduced motion by default; geometric assertions, no screenshot
  comparisons. A test exposing an unfixed app bug is marked `test.fail()` with the reason.
  New features get an E2E check when they affect layout, navigation, language or motion.
- Every completed feature ships with meaningful tests. Prefer test-first when practical.

## Commands

Run from the repository root (after `nvm use`):

| Command                               | Purpose                                               |
| ------------------------------------- | ----------------------------------------------------- |
| `npm install`                         | Install all workspace dependencies                    |
| `npm run dev`                         | Start the shell dev server (http://localhost:5173)    |
| `npm run build`                       | Type-check and build all workspaces                   |
| `npm run lint`                        | ESLint (type-aware) in all workspaces                 |
| `npm run typecheck`                   | `tsc -b` in all workspaces                            |
| `npm test`                            | Vitest unit/component tests in all workspaces         |
| `npm run format`                      | Format the whole repo with Prettier                   |
| `npm run format:check`                | Check formatting (no writes)                          |
| `npm run content:todo`                | List content placeholders still awaiting confirmation |
| `npm run content:check`               | Fail if any content placeholder remains (CI gate)     |
| `npm run illustrations -w apps/shell` | Rebuild WebP derivatives from `docs/assets/source/`   |
| `npm run favicon -w apps/shell`       | Rebuild the favicons (mascot head crop) in `public/`  |
| `npm run test:e2e`                    | Build, serve and run the Playwright E2E suite         |
| `npm run report -w e2e`               | Open the last E2E HTML report                         |

The Rails API (`services/api`, Ruby from `.ruby-version` via asdf) is outside the npm
workspaces; its setup and commands are in `services/api/README.md`:

| Command                                             | Purpose                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| `docker compose -f infra/compose.yaml up -d --wait` | Start PostgreSQL (from the root)                 |
| `docker compose -f infra/compose.yaml down`         | Stop PostgreSQL, keeping its data                |
| `bin/setup --skip-server`                           | Install gems, prepare development and test DBs   |
| `bin/rails server`                                  | Start the API (http://localhost:3000, `/up`)     |
| `bundle exec rspec`                                 | Run the API test suite                           |
| `bin/ci`                                            | All API checks: RuboCop, audits, Brakeman, RSpec |

Inside a workspace (e.g. `apps/shell`): `npm run test:watch` runs Vitest in watch mode.

### Tooling notes

- The API's local secrets live in git-ignored `infra/.env` and `services/api/.env` (copies of the
  committed `.env.example` files). Never commit them or `config/master.key`. Prettier ignores
  `services/api/` except its README (RuboCop covers the Ruby code).
- E2E browsers are a one-time setup: `npx playwright install chromium` and, on Linux/WSL,
  `sudo npx playwright install-deps chromium` (system libraries).

- `apps/shell` was scaffolded with `create-vite` (react-ts template); the template's oxlint
  setup was replaced with ESLint as decided in the plan.
- ESLint 10 flat config (`apps/shell/eslint.config.js`): `typescript-eslint`
  `recommendedTypeChecked`, `react-hooks`, `react-refresh`, `eslint-plugin-jsx-a11y-x` (the
  maintained fork of `eslint-plugin-jsx-a11y`, which does not support ESLint 10), and
  `eslint-config-prettier` last.
- Vitest config lives in `vite.config.ts` (jsdom environment, `src/test/setup.ts` registers
  jest-dom matchers). Tests import `describe/it/expect` from `vitest` explicitly (no globals).
- Prettier config is at the repo root (`.prettierrc.json`) and is shared by all JS workspaces.

## Collaboration rules

The user actively participates in development and reviews every technical decision. Claude is a
technical partner, not an autonomous implementer. For **each step**:

1. **Explain** what will be implemented and why.
2. **Present** the complete implementation plan, the main technical decisions with their
   alternatives/tradeoffs, and a clear recommendation for every open decision.
3. **Request approval through the interactive approval menu.** Enter plan mode, write the
   step's plan to the plan file, and call the plan-approval tool (`ExitPlanMode`). The user
   then chooses: "Yes, auto mode", "Yes, manually", or provides custom instructions. Do not ask
   for approval as a typed question.
4. Only after approval, implement the **entire approved step** (files and tests), and nothing
   beyond it.
5. **After implementation:** explain the important code, report test results honestly (including
   failures), update docs/ADRs when relevant, then **wait for the user's review**.

Hard rules:

- **Never continue automatically to the next step.** Suggest it, then stop.
- **Never create Git commits.** The user handles all commits manually.
