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

**Phase 2 — Ruby on Rails API + PostgreSQL: done** (Steps 2.0–2.6; GitHub Actions green on
`5f9eb59`). **Phase 3 — Frontend/backend integration and MVP completion: done** (Steps 3.0–3.5;
GitHub Actions green on `f66efbf`; the MVP is complete). **Phase 4 — Deployment: in progress**
(Steps 4.0–4.4 done: `13938b0`, `2653ba5`, `6b9c9ed`, `35beb2d`, `4bdf06a`; Step 4.5, the
static-first architecture and documentation revision, done in `2db5e00`; Step 4.6a, dark mode
without the night art, done in `d4d324e`; Step 4.6b, the night Home art and the removal of the
mascot's emphasis marks, done in `2773f75`; Step 4.7, the projects (with About and Contact
refinements), done in `91271c7`; Step 4.8, the résumés, done; Step 4.9, the public README (developer
detail in `docs/DEVELOPMENT.md`), done in `f5f223d`; Step 4.10, the comment review, done in `e217887`;
Step 4.11, the Cloudflare Pages preview on `*.pages.dev`, in progress (the repository side ready for
review; the deployment is the owner's); then 4.12 custom domain and publication; details, prerequisites and the spending log
are in `docs/ROADMAP.md`). **Deployment strategy (ADR-0016, 2026-10-28, superseding ADR-0015):**
only the **static** build is published, on Cloudflare Pages Free; the Rails API and PostgreSQL
stay implemented, tested and documented and run **locally** (full-stack mode), never as paid
cloud services. Phase 4 rules: one step at a time; **never create cloud resources, buy anything
or incur charges without the owner's explicit approval** (record approved expenses in the
ROADMAP's spending log; the domain is the only expected one); keep one repository, one `main`
branch, both build modes, all backend code, Docker support and all five CI jobs; the `Dockerfile`
never contains secrets; **never describe the backend as hosted, deployed or public** (the README,
the Architecture page and the Fun Facts separate what the repository implements from what runs in
production; `content/architecture.test.ts` checks it); deploying the full stack would need a new
ADR and the ROADMAP's "If the full stack is ever deployed" checklist; never claim automatic
deletion of contact messages unless a purge is actually scheduled. **Long-term requirement:** one codebase builds a
**full-stack** site (Rails API + PostgreSQL) or a **static** site (local data, no backend),
chosen at build time by `VITE_APP_MODE` (`static` by default, `fullstack` explicitly; ADR-0014).
Read the mode only through `src/config/mode.ts`; per-section differences go in the registry's
`fullstack` overrides (`sectionInMode()`); full-stack-only code must stay behind the mode so the
static build contains none of it (the static E2E run checks). Integration rules (Phase 3,
still in force):

- API calls are same-origin `/api` through the Vite proxies (no CORS).
- The shell's API types (`apps/shell/src/api/schema.ts`) are generated from
  `services/api/docs/openapi.yaml`: never edit them; change the contract, then run
  `npm run api:types` (`npm run api:types:install` once).
- Pages and components render the shell's own models (e.g. `Project` in
  `apps/shell/src/projects/model.ts`), fed by the static data or by the API mapping in
  `apps/shell/src/api/`; `src/components/` and `src/sections/` never import `src/api/`
  (ESLint-enforced). The static data (`content/projects.ts`) stays permanently for static mode;
  `services/api/db/seeds.rb` holds the same projects: change both in the same commit (the
  full-stack E2E compares them after normalising both to `Project`).
- In full-stack mode an API failure is shown as an error, never replaced by static data; the
  contact form exists only in full-stack mode (`sections/contact/ContactForm.tsx`, loaded lazily
  behind the mode check, submitting through the registry `action` in `src/contact/action.ts`,
  which loads `src/contact/submit.ts` the same way; its client checks in
  `src/contact/validation.ts` mirror `ContactMessage` in Rails, so change them together). Never
  retry a contact submission automatically, and keep the privacy note truthful (no automatic
  deletion promise until the purge is scheduled, Phase 4).
- Keep the design, responsiveness and bilingual routing unchanged.
- Architecture milestones describe the project (the same in both builds); each build's timeline
  note says whether that build uses the API (`content/architecture.test.ts`).

Phase 2 is complete when the API, persistence, endpoints, security and RSpec suite work on their
own (no frontend required). **The MVP is complete only at the end of Phase 3** (integration and
full-stack validation). **Deployment is postponed** to Phase 4; do not add hosting, CD or
production infrastructure before it. The roadmap, step list, acceptance criteria and recorded
decisions live in **`docs/ROADMAP.md`** (version-controlled source of truth; keep it current).

The API runs Ruby 4.0.9, Rails 8.1.4 and PostgreSQL 18.6 (ADR-0011). Do not add Python, Redis,
Sidekiq or Vue until their phase.

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
  Localised data is JSONB `{ "en", "pt-BR" }`; the handwritten OpenAPI document
  (`services/api/docs/openapi.yaml`, 3.0.3) is the contract between API and shell (ADR-0012):
  change it first, and every request spec validates against it (committee). Contact messages follow ADR-0013 (privacy, abuse protection,
  12-month retention): never log their values (keep them in `filter_parameters`, keep SQL query
  log tags off, never log a database error's message) and never add an endpoint that reads them.
  Rate limits key on `client_ip`, which ignores forwarded headers from untrusted peers. Every
  response documented in `openapi.yaml` must be asserted by a request spec (a complete RSpec
  run fails otherwise).
- **Hosting** (ADR-0016; not published yet): the **static** build on Cloudflare Pages Free (SPA
  fallback, `_headers`), no backend, a custom domain at publication (Step 4.12). The full stack
  is not hosted anywhere: it runs locally. (ADR-0015's two-stage plan, Render for about three
  months then Pages, was superseded in Step 4.5 on cost; an earlier VPS plan was dropped in 4.1.)
- **Production image** (Step 4.2; root `Dockerfile` and allowlist `.dockerignore`; built and
  smoke-tested in CI, run locally, not deployed): three
  stages (the shell's `build:fullstack` on Node 22, production gems, then a `ruby:4.0.9-slim`
  runtime with no Node and no development gems), base images pinned by tag **and** digest
  (update together), a non-root user, `CMD` = Puma only. The shell is served by the
  `ShellAssets` middleware (`services/api/lib/middleware/shell_assets.rb`), enabled only when
  `SHELL_ROOT` is set (the image sets it): `/api`, `/api/…` and `/up` always go to Rails, so the
  SPA fallback can never swallow API errors; hashed `/assets/*` are cached for a year,
  `index.html` is revalidated; missing files, `*.map`, dot segments and server-side names are a
  plain 404. **Never migrate on web startup:** `services/api/bin/release` (migrate + seed,
  production only, stops at the first failure) runs once per deploy as a separate command.
  `scripts/smoke-image.sh` tests an image on a throwaway `portfolio_smoke` database only.
- **Static hosting** (the production site, Step 4.4; `deploy/cloudflare-pages/README.md`): Cloudflare Pages
  serves `npm run build:pages` (the static build plus `deploy/cloudflare-pages`: `_headers` and
  `assets/404.html`; never put them in `apps/shell/public`). Every build writes
  `build-mode.json`; `scripts/prepare-pages.mjs` refuses anything but `static` and validates
  `_headers`. **`_headers` must equal the full-stack image's `SecurityHeaders`** (one policy for
  both modes; the parity spec in `services/api/spec/deploy/` fails otherwise): change both
  together. No top-level `404.html` (it would switch Pages' SPA mode off). The static E2E suite
  runs under the pinned Pages emulator (`tools/pages-emulator`, `npm run pages:emulator:install`;
  dev and CI only); `E2E_STATIC_SERVER=preview` uses `vite preview`, and `E2E_STATIC_SERVER=remote
E2E_BASE_URL=https://…` tests a deployed site (read-only, starts nothing). `_headers` keeps every
  `*.pages.dev` address out of search engines (absolute-URL `X-Robots-Tag: noindex` rules, pinned
  by the parity spec); never add a rule that matches the custom domain. Nothing is on Cloudflare
  yet (the deployment is the owner's, Step 4.11).
- **Production hardening** (Step 4.3): `ALLOWED_HOSTS` (exact hostnames) is required in
  production, validated by `lib/production_settings.rb` (boot fails otherwise; `/up` exempt);
  optional `TRUSTED_PROXIES` replaces Rails' default proxy list (verifying a host's value is a
  gate before the full stack is ever deployed; development and test unchanged). `SecurityHeaders` (first in the stack, every
  environment) sets the security headers and the **enforced CSP**: the shell's document is
  same-origin only with **no inline scripts or styles** (keep it that way; a feature that needs
  more changes the policy here and in Cloudflare Pages' `_headers` together), JSON
  gets `default-src 'none'`. HSTS is one day without `includeSubDomains` until the domain is
  verified (revisit in 4.12). Production request logs never include client IPs
  (`RequestLogger`); `/up` (`HealthController`) checks PostgreSQL and never returns error
  details. The browser smoke fails on any CSP violation; `SMOKE_WRITE=1` only against a
  throwaway database.
- **CI** (ADR-0010, `.github/workflows/ci.yml`): on pushes to `main` and pull requests, five
  parallel jobs: `quality` (`npm ci`, format, lint, typecheck, unit tests, `content:check`,
  build), `e2e` (full stack since Step 3.1: PostgreSQL service and Ruby, then Playwright + axe
  against the e2e API and the shell's full-stack preview; HTML report artifact), `e2e-static`
  (the same suite against the static build, no API; since Step 3.3) and `api` (`ruby/setup-ruby` from
  `services/api/.ruby-version` with the Bundler cache, a `postgres:18.6-trixie` service container,
  then `bin/ci`), and `image` (since Step 4.2: builds the production `Dockerfile` and runs
  `scripts/smoke-image.sh` with the browser smoke against a disposable PostgreSQL service; the
  image is never pushed). Read-only token, actions pinned to commit SHAs (update SHA and release comment
  together), no secrets (the `api` job's database password is a documented throwaway). Keep CI
  calling root npm scripts and `bin/ci` so it never drifts from local commands: new API checks
  go into `services/api/config/ci.rb`, not the workflow. Keep the PostgreSQL image tag identical
  in `infra/compose.yaml` and the workflow; bump the setup-ruby SHA with `.ruby-version`.

## Conventions

- TypeScript `strict` mode (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Minimal dependencies. The shell's runtime deps (unchanged since Phase 1): `react`, `react-dom`,
  `react-router` (v8), and `@fontsource-variable/inter` (self-hosted font). Adding a dependency requires a stated reason.
- Styling (ADR-0003): CSS Modules next to each component; global styles only in
  `apps/shell/src/styles/` (`reset.css`, `tokens.css`, `global.css`, plus the `.container`
  utility). Components use **purpose-named tokens only** (`--color-text`, `--color-accent`, ...),
  never raw palette values. Mobile first; breakpoints `40rem` / `48rem` / `64rem`.
- Muted grey (`#9d928f`) and slate (`#738297`) are decorative only; use `--color-text-muted` /
  `--color-text-slate` for text.
- **Themes** (ADR-0017): light (the approved design) and dark, on `<html data-theme>`, set
  before the first paint by `public/theme-init.js` (no inline scripts: the CSP) and mirrored by
  `src/theme/theme.ts` (keep them in step; a unit test runs the script). Dark remaps **colour
  tokens only** in one `:root[data-theme='dark']` block of `tokens.css`; components never branch
  on the theme. Every new colour token needs a dark value, and `styles/themes.test.ts` must keep
  AA contrast in both themes. The toggle (`components/ThemeToggle`) shares the EN/PT pill
  (`components/Preferences`) in all three header layouts; the desktop header must stay one row
  from 1024px with classic scrollbars (`e2e/tests/theme.spec.ts`). The Home backdrop (`mascot/HomeBackdrop`) shows the approved day
  painting in light and the night one in dark (never CSS-darkened; `ART-BRIEF.md` §9): one layer
  per theme, the other requested only after a switch, a 250 ms crossfade (0 under reduced
  motion). Each painting keeps its natural aspect ratio, anchored at the top (the approved
  framing): never let the layer fill the backdrop, or `object-fit: cover` crops and zooms it
  (`e2e/tests/theme.spec.ts`).
- Accessibility is a requirement: semantic landmarks, keyboard navigation, visible focus,
  `prefers-reduced-motion` support, AA contrast. The mascot is decorative
  (`aria-hidden`, `pointer-events: none`) and must never block content. Step 10 audit
  baseline: 0 axe violations (WCAG 2.2 AA + best practices) in both languages; keep it there.
- **Page transitions** (ADR-0008): every internal navigation passes React Router's
  `viewTransition` (links, `ButtonLink`, the language switcher, and `navigate()` calls). Only
  the region between header and footer crossfades (`view-transition-name: page`); the header
  and its walking mascot never animate. New motion must use the duration tokens
  (`--duration-fast`, `--duration-base`; 0ms under reduced motion) and never move layout.
  Under reduced motion, `global.css` sets every transition to **0s** (never a non-zero global
  duration such as 0.01ms: with `transition-property: all` it would delay every style change and
  make measured layouts jump; Step 4.0, `global.test.ts`, `e2e/tests/layout-stability.spec.ts`).
- **Truthfulness:** the Fun Fact and Architecture page must only describe what is actually
  implemented. Planned components are marked `planned`. Until the site is published (4.12) the
  Architecture components are `done`, not `live`; the backend is always described as running
  locally, never as hosted (ADR-0016).
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
  professional work is not a portfolio project; a personal project in a private repository is
  shown without any link (`content/projects.test.ts`); a new project technology goes in four
  places (`openapi.yaml` first, then `npm run api:types`, `Project::TECHNOLOGIES`,
  `sections/technologies.ts`); Python and AI engineering are presented only as
  areas of ongoing development. **Never publish a phone number** (`privacy.test.ts` rejects
  phone-like text using a generic pattern; never write the real number into the repo, tests
  included). Résumé PDFs are git-ignored, except the public phone-free copies in
  `apps/shell/public/resumes/` (one per language, linked by `about.resume.href` in
  `content/profile.ts`; explicit `.gitignore` exceptions, Cloudflare's `/resumes/*` rule drops
  the CSP for them). Before adding or replacing one, check its text **and metadata** for a phone
  number.
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
  manifest. See `docs/assets/ART-BRIEF.md` §8. The only derivative-time change to approved art is
  the removal of A3's three detached orange emphasis marks (guarded; owner's decision, Step 4.6b).
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
- End-to-end (ADR-0009, `e2e/`): Playwright against the full stack: the shell's production build
  (`vite preview`, proxying `/api`) and the Rails API in its `e2e` environment
  (`services/api/bin/e2e-server`, database `portfolio_api_e2e`, ports 4173 and 3100; servers are
  never reused). Specs that write to a rate-limited endpoint run serially on the desktop project
  and call `resetRateLimits()` (`e2e/support/rateLimits.ts`); they all live in
  `e2e/tests/contact-api.spec.ts` (two files would race on the shared store), which also reads
  back what was stored through `e2e/support/database.ts` (a read-only Rails runner script that
  refuses any environment or database but e2e), and every other spec stubs such endpoints with
  `page.route`. Projects `desktop` (real scrollbars) and `mobile`, with `@axe-core/playwright` (any
  violation fails). Specs import languages, dictionaries and the registry from the shell, so
  expectations follow the app; reduced motion by default; geometric assertions, no screenshot
  comparisons. A test exposing an unfixed app bug is marked `test.fail()` with the reason.
  New features get an E2E check when they affect layout, navigation, language or motion.
- Every completed feature ships with meaningful tests. Prefer test-first when practical.

## Commands

The contributor-facing guide is `docs/DEVELOPMENT.md` (keep it in step with this table); the
README is for visitors.

Run from the repository root (after `nvm use`):

| Command                                  | Purpose                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm install`                            | Install all workspace dependencies                                                    |
| `npm run dev`                            | Start the shell dev server (static mode, port 5173)                                   |
| `npm run dev:fullstack`                  | Dev server in full-stack mode (needs `bin/rails s`)                                   |
| `npm run build`                          | Type-check and build all workspaces (static site)                                     |
| `npm run build:fullstack`                | Build the full-stack shell (`VITE_APP_MODE=fullstack`)                                |
| `npm run lint`                           | ESLint (type-aware) in all workspaces                                                 |
| `npm run typecheck`                      | `tsc -b` in all workspaces                                                            |
| `npm test`                               | Vitest unit/component tests in all workspaces                                         |
| `npm run format`                         | Format the whole repo with Prettier                                                   |
| `npm run format:check`                   | Check formatting (no writes)                                                          |
| `npm run content:todo`                   | List content placeholders still awaiting confirmation                                 |
| `npm run content:check`                  | Fail if any content placeholder remains (CI gate)                                     |
| `npm run api:types:install`              | Install the locked OpenAPI type generator (once)                                      |
| `npm run api:types`                      | Regenerate `apps/shell/src/api/schema.ts`                                             |
| `npm run api:types:check`                | Fail if the generated API types are stale (CI gate)                                   |
| `npm run illustrations -w apps/shell`    | Rebuild WebP derivatives from `docs/assets/source/`                                   |
| `npm run favicon -w apps/shell`          | Rebuild the favicons (mascot head crop) in `public/`                                  |
| `npm run test:e2e`                       | Full-stack E2E: the e2e API plus the preview                                          |
| `npm run test:e2e:static`                | Static E2E: the static build alone, no API                                            |
| `npm run build:pages`                    | Static build prepared for Cloudflare Pages (Step 4.4)                                 |
| `npm run pages:emulator:install`         | Install the Pages emulator once (the static E2E suite needs it)                       |
| `docker build -t portfolio:local .`      | Build the production image (Step 4.2)                                                 |
| `scripts/smoke-image.sh portfolio:local` | Smoke-test an image (needs `PG*` variables; `SMOKE_BROWSER=1` adds the browser smoke) |
| `npm run report -w e2e`                  | Open the last E2E HTML report                                                         |

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
  `sudo npx playwright install-deps chromium` (system libraries). E2E also needs the API's
  setup (Ruby, `services/api/.env`) and PostgreSQL running (`docker compose -f infra/compose.yaml
up -d --wait`).
- `/api` is proxied by the Vite dev server and `vite preview` to `API_PROXY_TARGET` (default
  `http://127.0.0.1:3000`, a development API from `bin/rails server`); same-origin, no CORS.

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
