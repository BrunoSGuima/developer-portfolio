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

**Phase 2 (Ruby on Rails API + PostgreSQL) is done:** every acceptance criterion below is met,
and GitHub Actions ran green on the final Step 2.6 commit (`5f9eb59`, 2026-10-26).

**Phase 3 (integration and MVP completion) is done, and with it the MVP:** Steps 3.0
(`84b4e4c`), 3.1 (`c922ddc`), 3.2 (`1b6bca1`), 3.3 (`4b3f833`), 3.4 (`9d7b47b`) and 3.5
(`f66efbf`); all four GitHub Actions jobs passed on `f66efbf` ([run 40561117258](https://github.com/BrunoSGuima/developer-portfolio/actions/runs/40561117258)).
**Phase 4 (deployment) is in progress:** Step 4.0 (the Home layout fix) is done (`13938b0`);
Step 4.1 (the deployment architecture, ADR-0015) is done (`2653ba5`); Step 4.2 (the production
image) is ready for review; see "Phase 4 — Deployment" below. Nothing is deployed and nothing has been purchased. In a full-stack build the Projects page loads from the Rails API and the Contact page has a form
that sends to it; a static build uses local data and keeps the channels only. **Long-term
requirement (2026-10-26):** the same codebase builds a **full-stack** site (React + Rails API +
PostgreSQL) or a **static** site (local data, no backend), so the portfolio can stay public
after the paid backend is shut down (see "Two modes" below).

| Phase | Scope                                                                                                                                                                 | Status           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1     | **React frontend foundation**: React + TypeScript shell, static data, mascot, Fun Fact, responsive layout, en/pt-BR, unit + E2E tests, CI                             | Done             |
| 2     | Ruby on Rails API + PostgreSQL: projects and contact messages, security, RSpec + FactoryBot, OpenAPI contract, its own CI job; works and is tested on its own         | Done (`5f9eb59`) |
| 3     | Frontend/backend integration, full-stack validation and **MVP completion**: the shell reads projects and sends contact messages through the API, full-stack E2E in CI | Done (`f66efbf`) |
| 4     | Production deployment (first public release): host and reverse proxy, CD, monitoring, prerendering/SEO                                                                | In progress      |
| 5     | Vue 3 microfrontend mounted by the React shell (order of 5–8 provisional)                                                                                             | Planned          |
| 6     | Python FastAPI service + interactive quiz                                                                                                                             | Planned          |
| 7     | Background jobs (Redis + Sidekiq)                                                                                                                                     | Planned          |
| 8     | AI Lab and future expansion                                                                                                                                           | Planned          |

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
7. Versions: chosen only after verifying stable releases, compatibility and tooling support.
   Step 2.1 chose **Ruby 4.0.9, Rails 8.1.4 and PostgreSQL 18.6** (rationale in ADR-0011).

Also required: same-origin API (no CORS), the backend testable on its own, no unnecessary gems
or premature abstractions, spam protection and privacy safeguards on the contact endpoint, the
rate limiter's limitations documented before deployment, and an explicit contract (the OpenAPI
document) instead of Rails tests reading TypeScript files. Redis, Sidekiq, Vue and FastAPI stay
out of Phase 2.

| #   | Step                       | Status | Depends on |
| --- | -------------------------- | ------ | ---------- |
| 2.0 | Terminology and ADRs       | Done   | —          |
| 2.1 | Toolchain and API skeleton | Done   | 2.0        |
| 2.2 | CI `api` job               | Done   | 2.1        |
| 2.3 | Projects domain            | Done   | 2.1        |
| 2.4 | Projects API               | Done   | 2.3        |
| 2.5 | Contact messages           | Done   | 2.4        |
| 2.6 | Hardening and docs         | Done   | 2.5        |

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
- **Delivered:** Ruby 4.0.9 (passed the compatibility gate), Rails 8.1.4,
  PostgreSQL 18.6 in Compose (loopback only, named volume, TCP healthcheck); dotenv,
  rspec-rails, factory_bot_rails; adapted `bin/setup` (prepares the development and test
  databases, with hints when PostgreSQL or `.env` is missing) and `bin/ci` (setup, RuboCop,
  bundler-audit, Brakeman, RSpec); specs for `GET /up`, the environment (Ruby, Rails 8.1,
  API-only, no CORS, FactoryBot) and the database (PostgreSQL 18, test database, transactional
  isolation); `services/api/README.md` with setup and troubleshooting. Owner's decisions:
  Rails' encrypted credentials kept (`master.key` ignored); Action Mailer and Active Job kept,
  unconfigured.

### Step 2.2 — CI `api` job

- **Goal:** the API is checked on every push and pull request, independently of the shell.
- **Decisions:** a third job in `ci.yml` with a PostgreSQL service container, `ruby/setup-ruby`
  pinned by SHA (bundler cache), same security rules as ADR-0010; steps RuboCop → Brakeman →
  bundler-audit → `db:prepare` → RSpec.
- **Acceptance:** actionlint clean; clean-copy rehearsal; green on GitHub; ADR-0010 updated.
- **Delivered:** the `api` job in `ci.yml`: Ruby from `.ruby-version`
  (`ruby/setup-ruby` v1.335.0, Bundler cache, frozen lockfile), a `postgres:18.6-trixie` service
  container with a health check, the connection through `DATABASE_*` variables (a documented
  throwaway password, no repository secrets) and a single step running **`bin/ci`** (setup with
  the development and test databases, RuboCop, bundler-audit, Brakeman, RSpec), so local and CI
  checks can't drift. Owner's decisions (2026-10-25): same workflow file, one `bin/ci` step, no
  path filters. Validated: actionlint + shellcheck clean; clean-copy rehearsal without `.env`
  against a temporary PostgreSQL 18.6 passed, and a deliberate RuboCop offense failed it. Green
  on GitHub is confirmed after the owner's push; then add `api` to the required checks.

### Step 2.3 — Projects domain

- **Goal:** projects stored in PostgreSQL with bilingual text.
- **Files:** migrations, `Project` and `ProjectLink` models, the localised-text validator,
  factories, seeds with the current site's projects (en + pt-BR).
- **Decisions:** JSONB localised fields with check constraints (both languages, non-blank);
  unique `slug`; `status` limited to the site's status words; https-only links; technology ids
  from an allowed list (documented as an OpenAPI enum).
- **Tests:** model specs for validations and specs proving the database constraints reject bad
  rows; seeds load.
- **Delivered:** migrations for `projects` and `project_links` with named
  check constraints (localised JSONB with both languages, non-blank and bounded; slug format;
  status words; non-negative positions; no NULL technology; https-shaped URLs), a unique slug,
  a unique URL per project and a cascading foreign key; `Project` (read-only slug, technology
  allowlist `Project::TECHNOLOGIES`, `published` defaulting to false, `published` and `ordered`
  scopes) and `ProjectLink` (strict https URL parsing); `LocalizedTextValidator` and
  `LocalizedText` normalisation; factories; idempotent, transactional seeds with the site's
  current project (the test database is never seeded). Owner's decisions (2026-10-25): ids-only
  technologies with the allowlist in the model, no tags, string status with a check, seeds in
  Ruby copied verbatim from the shell (to update together in Phase 3), the defaults and limits
  above, immutable slugs; the model parses URLs while the database checks their shape
  (documented in the API README). Tests: model, validator, database-constraint and seed specs
  (idempotence, link replacement, full rollback on failure). No endpoints yet (Step 2.4).

### Step 2.4 — Projects API

- **Goal:** `GET /api/v1/projects` (published, ordered) and `GET /api/v1/projects/:slug`.
- **Files:** a base API controller with consistent error handling, small plain-Ruby serializers,
  `services/api/docs/openapi.yaml`, request specs.
- **Decisions:** `{ "data": … }` responses, `{ "error": { code, message, details } }` errors,
  snake_case keys; every response validated against OpenAPI with `committee`.
- **Tests:** 200, 404, unpublished hidden, order, both languages present, contract validation.
- **Delivered:** read-only routes under `/api/v1` (index and show by slug),
  `Api::BaseController` (the error envelope), `ProjectSerializer` (explicit field allowlist: no
  id, position, published or timestamps), `Api::ErrorsController` as `config.exceptions_app`,
  and `services/api/docs/openapi.yaml`. Owner's adjustments (2026-10-25/26): **405** with
  `Allow: GET, HEAD` for write methods on the project resources (404 for unknown paths and for
  unknown, unpublished or badly formed slugs); unexpected errors keep Rails' detailed responses
  in development and render a generic envelope in production; the document is **OpenAPI
  3.0.3** because the released committee doesn't support 3.1 yet (ADR-0012). Tests: request
  specs with contract validation on every response (errors included), drift specs, enum and
  route parity with the document, a production-mode 500 without exception details, a 2-query
  index.

### Step 2.5 — Contact messages

- **Goal:** `POST /api/v1/contact_messages` with validation, persistence and abuse protection.
- **Decisions (ADR-0013):** minimal fields (name, email, message, locale); no IP stored;
  personal fields filtered from logs; a honeypot (fake success, nothing stored); Rails
  `rate_limit`; rake tasks to list messages and purge those older than 12 months.
- **Tests:** 201, 422 with per-field details, 429, honeypot not stored, request-size limits,
  model and task specs, contract validation.
- **Delivered:** `contact_messages` (name, email, message, locale; no IP or
  user agent) with check constraints mirroring the model (lengths, no control characters, NUL
  rejected with a 422); `POST /api/v1/contact_messages` answering **202** without an id
  (identical for the honeypot `website`), 422 with validation codes per field, 400/413/415 from
  `JsonBodyGuard` (JSON objects of at most 32 KB, checked before Rails parses; bodies sent to
  any other `/api` route are discarded unread, so their 405s are unchanged), 429 with
  `Retry-After`, and 405 `Allow: POST` for every other method (nothing reads messages over
  HTTP); rake `contact_messages:list` (at most 20, newest first, `SINCE`, personal-data
  warning) and `contact_messages:purge` (12 months, `DRY_RUN`). Owner's refinements
  (2026-10-26): **two limits per IP**, 20 requests and 5 accepted messages per hour, so
  validation mistakes don't lock visitors out; personal data verified absent from request and
  SQL logs for stored, rejected and malformed messages, database errors and unexpected
  exceptions. Found and fixed while verifying: Rails logs the raw body of unparsable JSON at
  debug level (hence the middleware), `rescue_from` logs exception messages (database errors
  are rescued in the action and only their class logged), and development's SQL query log tags
  inline bind values into the log (turned off, guarded by a spec). Email delivery stays
  deferred (a Phase 4 prerequisite).

### Step 2.6 — Hardening and docs

- **Goal:** close Phase 2.
- **Work:** bundler-audit clean, parameter-filter review, the API README (setup, commands,
  endpoints), ADRs completed (versions recorded in ADR-0011), the rate limiter's limitations
  documented.
- **Delivered, owner's decisions 2026-10-26:**
  - **Rate-limit key hardened:** Rails' `request.remote_ip` believes forged `X-Forwarded-For` /
    `Client-IP` headers from any peer, so a client reaching the API directly could rotate a
    header to escape both contact limits. The key now uses forwarded headers only when the
    direct peer is a trusted proxy (Rails' defaults: loopback and private networks), otherwise
    the peer address (`ContactMessagesController#client_ip`). Rails' IP-spoofing check is off:
    it raised on contradictory headers inside the request logger, outside Rails' error
    handling, so any client could crash a request. Production proxy settings stay in Phase 4.
  - `JsonBodyGuard` error responses (400, 413, 415) carry `X-Content-Type-Options: nosniff`.
  - **Contract coverage:** committee's `SchemaCoverage` fails a complete run when a documented
    response is never asserted by a request spec (HEAD is not a documented operation; the
    documented 500s are exercised with controlled failures rendered as in production).
  - The 405 and catch-all routes have no path helpers (`as: nil`); `config/bundler-audit.yml`
    has an empty ignore list; `contact_messages:list` rejects an invalid `LIMIT` (1–500) or
    `SINCE` with a one-line message.
  - New specs: forged forwarding headers, the middleware on its own (chunked bodies, the 32 KB
    boundary, trailing slash, discarded bodies, nosniff), international text, task inputs.
  - Documentation finalised (README files, `CLAUDE.md`, this roadmap, ADR-0011/0012/0013).

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

**Evidence (Step 2.6, 2026-10-26):**

| #   | Status | Evidence                                                                                                                                                                                                                                                           |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Met    | The README's one-time setup followed in a fresh clone (isolated Compose project and port): Ruby from `.ruby-version`, one shared password, PostgreSQL healthy, `bin/setup` created and seeded the databases, `/up` 200, the seeded project served, `bin/ci` green. |
| 2   | Met    | 253 RSpec examples; every request spec asserts the OpenAPI contract; drift and enum/route parity specs; committee coverage fails a complete run if any documented response is never exercised.                                                                     |
| 3   | Met    | `bin/ci`: 253 examples, 0 failures; RuboCop 60 files, no offenses; Brakeman 0 warnings; bundler-audit clean; clean-copy CI rehearsal green. GitHub Actions green on every Phase 2 commit, including the final one (`5f9eb59`).                                     |
| 4   | Met    | Validation, two rate limits (spoof-resistant key), honeypot, filtered logs (request, SQL binds, errors), no IP stored, `purge` task: covered by specs and mutation checks.                                                                                         |
| 5   | Met    | This roadmap, `CLAUDE.md`, both READMEs and ADR-0011/0012/0013 updated in Step 2.6.                                                                                                                                                                                |

When they are met, the Architecture timeline's v2 becomes **Done**. The frontend is unchanged
during Phase 2, so this one-line content change is **scheduled as the first task of Phase 3**
(owner's decision, 2026-10-26).

## Phase 3 — Integration and MVP completion

Planned and approved on 2026-10-26. The steps below are reviewed one at a time (plan → approval →
implementation with tests → review); none starts automatically. Constraints for the whole phase:
the design, responsive behaviour and bilingual routing (`/`, `/pt-br`) stay unchanged; no new
runtime dependency; no deployment or Phase 4 infrastructure.

| #   | Step                                                   | Status | Depends on |
| --- | ------------------------------------------------------ | ------ | ---------- |
| 3.0 | Architecture page and Phase 3 documentation            | Done   | —          |
| 3.1 | Same-origin development setup and full-stack E2E setup | Done   | —          |
| 3.2 | Typed API client                                       | Done   | —          |
| 3.3 | Mode selection and Projects data                       | Done   | 3.1, 3.2   |
| 3.4 | Contact form (full-stack mode only)                    | Done   | 3.1–3.3    |
| 3.5 | Both modes validated, docs and MVP completion          | Done   | 3.0–3.4    |

### Two modes: static and full-stack (owner's requirement, 2026-10-26)

One React codebase on one branch builds either mode; there are never two versions of the app.

- **Full-stack mode:** the shell reads projects from, and sends contact messages to, the Rails
  API (PostgreSQL), same-origin under `/api`.
- **Static mode:** the shell uses its local, typed data and works fully with no Rails API and no
  PostgreSQL (deployable as plain files); it makes no `/api` request and doesn't load the API
  client. Contact keeps the external channels (email, LinkedIn, GitHub); there is no form.
- **The mode is chosen at build time**, explicitly, by one setting read in one module (its name
  and default are decided in Step 3.3). Nothing is detected at runtime.
- **No silent fallback:** in full-stack mode an API failure shows an accessible error state with
  a retry; it never switches to static data.
- **One view model, two sources:** `apps/shell/src/projects/model.ts` (`Project`) is independent
  of both sources; the static source is `content/projects.ts` (**kept permanently**), the API
  source is `api/projects.ts` (mapping API responses to the model). Presentation components
  receive the model only and can't import the API layer (lint-enforced).
- **Truthfulness per mode:** Fun Facts, registry backends and the Architecture page describe the
  mode that was built.
- **Equivalent content:** the static data and the API's seeds hold the same projects, checked by
  comparing both **after normalising them to the `Project` model** (static data as-is, API
  responses through `toProject`), never their raw representations.

### Step 3.0 — Architecture page and Phase 3 documentation

- **Scope:** the Architecture timeline shows v2 **Done** and v3 **In progress**, and its note
  says the Rails API is built and tested but the pages aren't connected to it yet; the
  "Automated testing" and "Continuous integration" cards mention the Rails API's checks (no new
  card: the approved 10-card layout stays); ADR-0011 to 0013 join the decisions list (en +
  pt-BR); this Phase 3 plan; `CLAUDE.md` and README status.
- **Tests:** the truthfulness tests (v2 done and v3 in progress while no section uses Rails),
  the page and translation tests, the E2E suite; a before/after visual comparison at 375, 1280
  and 1600px in both languages.

### Step 3.1 — Same-origin development setup and full-stack E2E setup

- **Scope:** Vite `server.proxy` and `preview.proxy` for `/api` (target `VITE_API_PROXY_TARGET`,
  default `http://127.0.0.1:3000`): same-origin, no CORS. Playwright starts two web servers:
  Rails on port 3100 against a dedicated `portfolio_api_e2e` database (development environment,
  `DATABASE_NAME` override, `db:prepare db:seed`) and the shell's preview proxying to it. The CI
  `e2e` job becomes full-stack (a `postgres:18.6-trixie` service, `ruby/setup-ruby` with the
  Bundler cache). A smoke spec reads the seeded project through the proxy.
- **Rate limits in E2E (decision A2):** the E2E Rails server gets `RATE_LIMIT_STORE_PATH`, which
  switches the rate-limit store to a file store at that path; without it the store stays in
  memory, and the variable must never be set in production (checked by a spec and documented).
  No test-only endpoint, no limit raised or disabled, no forged forwarding headers.
- **Files:** `apps/shell/vite.config.ts`, `e2e/playwright.config.ts`,
  `services/api/config/{database.yml,application.rb}`, `.github/workflows/ci.yml`, an E2E smoke
  spec, READMEs, ADR-0009, ADR-0010.
- **Acceptance:** `npm run test:e2e` starts both servers and passes locally and in CI; the
  isolation is deterministic; the `quality` and `api` jobs are unchanged.
- **Delivered (`c922ddc`), owner's decisions 2026-10-26:** the plan above was refined
  before implementation:
  - **A dedicated Rails `e2e` environment** (`config/environments/e2e.rb`, based on development)
    with the fixed database `portfolio_api_e2e`, instead of the development environment with a
    database override: in Rails 8.1 the development environment's database tasks also act on
    the test database. Production-style JSON errors, a per-boot secret, query log tags off.
  - **The rate-limit file store is defined only in `e2e.rb`, at the fixed path
    `tmp/e2e/rate-limits`** (no `RATE_LIMIT_STORE_PATH` variable), so it can't be enabled
    elsewhere; a spec pins this.
  - **`bin/e2e-server`** (refuses any other `RAILS_ENV`): `db:prepare`, `db:seed`,
    `e2e:reset` (which aborts unless the environment is `e2e` **and** the connected database is
    `portfolio_api_e2e`, then empties contact messages and the rate-limit store), then Puma on
    `127.0.0.1:3100` with its own PID file. It never drops or resets a database.
  - **Proxy variable `API_PROXY_TARGET`** (not `VITE_`-prefixed, so it never reaches the bundle);
    Playwright never reuses running servers.
  - **Per-test rate-limit resets** (`e2e/support/rateLimits.ts`) delete the store directory only
    from serial, desktop-only real-API specs; verified to be deterministic against the live
    server (five accepted then 429, identically after each reset; the store directory is
    recreated by the next request).
  - Tests: the proxy against a stub upstream (status, headers and JSON bodies for 200/404/405
    and a controlled 500; method, path, query, body and Host forwarded unchanged); smoke specs
    through the real preview proxy (seeded projects, same-origin fetch, 404 and 405 envelopes);
    the rate-limit isolation spec; RSpec guards for the `e2e` environment, `bin/e2e-server` and
    `e2e:reset`. The CI `e2e` job is full-stack (PostgreSQL service, Ruby, 25-minute timeout).

### Step 3.2 — Typed API client

- **Two-mode additions:** the `Project` view model moves to the neutral
  `apps/shell/src/projects/model.ts`; the API mapping produces that model; an ESLint rule keeps
  `src/components/` and `src/sections/` from importing `src/api/`; the static data stays. No
  mode switch and no page change in this step.
- **Scope (decision A1):** types generated from `services/api/docs/openapi.yaml` by an
  **isolated, lockfile-pinned generator package** `tools/openapi-types/` (exact
  `openapi-typescript@7.13.0` and its supported peer `typescript@5.9.3`; committed
  `package-lock.json` with sha512 integrity; `npm ci --ignore-scripts`; not an npm workspace,
  so the shell's TypeScript 6 is untouched and no overrides are needed). `npm run api:types`
  writes `apps/shell/src/api/schema.ts` (committed); `npm run api:types:check` fails on drift and
  runs in the CI `quality` job. The generated file must compile under the shell's strict
  settings; if it doesn't, the fallback (handwritten types plus a YAML-based contract test) is
  proposed before use. `api/client.ts` (same-origin `fetch`, the error envelope as a typed
  `ApiError`, network errors, abort), the mapping to the existing `ProjectCard` props, and
  compile-time parity: the API's `Technology` ⊆ the shell's `TechId`, `Status` and `Locale`
  equal. ADR-0014 (frontend data access).
- **Acceptance:** the drift check is green in CI; no `any`; no UI change.
- **Delivered (`1b6bca1`):** see the "Step 3.2 delivery" notes below.

### Step 3.3 — Mode selection and Projects data

- **Mode:** the build-time mode setting (name and default decided in this step), one module
  that reads it, and two builds from the same branch.
- **Sources:** static mode renders `content/projects.ts` at once and never loads the API client;
  full-stack mode uses the Projects route's lazy `loader`, returning a deferred promise (verified
  with React Router 8.4.0: navigation completes while it is pending, and the loader runs again on
  every visit), rendered with `<Suspense>` + `<Await>` and accessible, localised loading, empty
  and error (Retry) states (decision A3). A cache inside the loader keeps the list for **5
  minutes**, never caches failures, is bypassed by Retry, and only stores a response if no newer
  request has started. **An API failure shows the error state, never static data.**
- **Truthfulness:** registry `backend`, the Projects and Home Fun Facts per mode (Rails and
  PostgreSQL badges in full-stack mode only); the seeded description and the static data updated
  together with owner-approved text.
- **Tests:** unit tests in both modes; E2E of the Projects page in both modes; the content
  parity check: static data and API projects compared after normalising both to `Project`.
- **Acceptance:** the loaded page looks identical in both modes (visual comparison); every state
  is accessible in both languages.

### Step 3.4 — Contact form (full-stack mode only)

- **Scope:** an accessible form below the existing channels (a route action plus
  `useFetcher`), **rendered only in full-stack mode**: name, email and message with client-side
  checks that mirror the contract, the page language, the hidden honeypot, localised field
  errors from the validation codes, the pending, success, rate-limited and generic error states,
  and the privacy note (owner-approved text). The Contact Fun Fact and registry `backend` follow
  the mode. **Static mode keeps today's page:** the external channels, no form, no `/api`
  request.
- **E2E (decision A2):** in full-stack mode, real-API submissions run serially on the desktop
  project and reset the file-based rate-limit store before each test (including a genuine 429
  after five accepted messages); language, mobile and error variants use `page.route` stubs. In
  static mode, the channels work and no form exists.
- **Acceptance:** WCAG 2.2 AA (axe, keyboard, focus management), both languages, both modes,
  the owner's visual review.
- **Implemented (owner's refinements, 2026-10-26):**
  - The privacy note describes the 12-month retention as a policy ("deleted within 12 months
    under my retention policy") and says the IP address isn't saved with the message. It makes
    no promise of automatic deletion (the purge isn't scheduled yet; see "Phase 4 prerequisites" below) and no
    claim about tracking or third parties.
  - Drafts survive a language switch (in memory only). A submission in flight is never sent
    twice: a ref blocks a second submit before the fetcher state changes, the fields are
    read-only while sending, and the shared fetcher keeps it, and its localised result, across
    the switch.
  - A failed connection is explained as ambiguous (the message may have arrived); nothing is
    retried automatically, and the rate limit is not relied on against duplicates.
  - Real submissions (success, a genuine 422 with the body altered in transit, a genuine 429,
    the honeypot) are in `e2e/tests/contact-api.spec.ts`, the only file that writes to the
    endpoint (it replaces `rate-limits.spec.ts`); each test marks its message and reads the e2e
    database back (stored, normalised, for the success; nothing stored for 422, 429 and the
    honeypot). `contact.spec.ts` stubs the endpoint.
  - The static build contains none of the form's code (lazy, mode-guarded imports) and only a
    small stub action that refuses submissions.

### Step 3.5 — Both modes validated, docs and MVP completion

- **CI:** builds and E2E for **both modes**: full-stack is the existing `e2e` job; static runs
  the suite against `vite preview` with no API and asserts that no `/api` request is made.
- **Architecture page per mode:** in full-stack mode the timeline's v3 becomes Done and the
  cards describe the integration; in static mode the page still lists what the project has
  built, and says this deployment serves static data.
- **Docs:** how to build and run each mode (READMEs), `CLAUDE.md`, ADR-0004, 0009, 0010, 0012
  and 0014, a note on running the static mode after the backend is shut down, and the
  acceptance evidence below. The MVP is complete once GitHub CI is green on this step.
- **Delivered (owner's decisions, 2026-10-27):**
  - **Milestones describe the project:** v3 is Done in both builds (the truthfulness test ties it
    to a Rails-backed section in the full-stack build); each build's timeline note says whether
    that build uses the API. ADR-0014 joins "Key decisions"; the CI card mentions both E2E
    modes. No new card.
  - **Data:** the static data and the seeds stay two copies, changed together; the normalised
    parity E2E (full-stack only) catches drift.
  - **Status:** "Validated, awaiting CI" until the Step 3.5 commit was green on all four jobs;
    it was (`f66efbf`), so Phase 3 and the MVP are Done.
  - **No new E2E specs;** one unit-test race fixed (focus after a server 422 is now awaited).
  - **Phase 4 prerequisites** rewritten as a checklist (below), including backups and restore,
    the mandatory automated purge and privacy/logging review, how messages are reviewed without
    forwarding them to a personal inbox, and how messages are handled when the backend is
    retired.

### Phase 3 acceptance criteria

1. In full-stack mode, the Projects page shows API data in English and Portuguese, with
   accessible loading, empty and error states; in static mode it shows the local data with no
   API.
2. The Contact page sends messages through the API, with accessible validation, localised
   errors, the honeypot, rate-limit messaging and the privacy note.
3. API requests are same-origin through the Vite dev and preview proxies; no CORS.
4. The shell's types are generated from the OpenAPI document and checked in CI; enum parity is
   enforced at compile time.
5. Full-stack Playwright E2E (shell, API, PostgreSQL) with axe passes locally and in CI; unit,
   RSpec and quality checks pass.
6. Fun Facts, registry backends and the Architecture page are truthful; the docs and ADRs are
   current.
7. The design, responsive behaviour and bilingual routing are unchanged (owner's visual review).
8. **Both modes from one branch:** the static build works with no API process, makes no `/api`
   request and keeps the external contact channels; the full-stack build uses the API for
   Projects and Contact; both are tested in CI.
9. **No silent fallback:** in full-stack mode, API failures show accessible error states (tested).
10. Fun Facts, registry backends and the Architecture page describe the built mode.

### MVP acceptance evidence (Step 3.5, 2026-10-27)

Validated locally on the Step 3.5 working tree (on top of `9d7b47b`), including a **clean-copy
rehearsal of all four CI jobs** (a fresh copy of the tracked files, `npm ci`, `CI=true`, the
workflow's commands): every step passed, with no flaky retries. **GitHub Actions:** all four
jobs passed on the pushed Step 3.5 commit `f66efbf` ([run 40561117258](https://github.com/BrunoSGuima/developer-portfolio/actions/runs/40561117258)).

| Check                                                       | Result                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Unit (Vitest, `npm test`)                                   | 487 passed; 10 consecutive full runs with no failure                           |
| E2E full stack (`npm run test:e2e`)                         | 210 passed, 50 skipped (by design: mobile and static-only)                     |
| E2E static (`npm run test:e2e:static`)                      | 174 passed, 86 skipped (by design: API- and form-only)                         |
| Rails (`bin/ci`: RuboCop, audits, Brakeman, RSpec)          | 269 examples, 0 failures                                                       |
| Format, lint, typecheck, `content:check`, `api:types:check` | Pass                                                                           |
| Builds                                                      | Both pass; the static bundle has no `/api/v1`, `contact_messages` or form code |
| Development and test databases                              | Unchanged by every E2E run (row counts and timestamps compared)                |

| Criterion                       | Evidence                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Projects, both modes         | `e2e/tests/projects.spec.ts` (both modes, both languages; loading, error and Try again with the real API); `ProjectsPage*.test.tsx` (loading, empty, error)                            |
| 2. Contact form                 | `e2e/tests/contact-api.spec.ts` (real Rails: 202 stored in PostgreSQL and read back, 422 and 429 not stored, honeypot not stored); `contact.spec.ts` (keyboard, pending, network, axe) |
| 3. Same-origin `/api`, no CORS  | `apps/shell/vite.config.test.ts` (dev and preview proxy); every E2E request goes through the preview's proxy                                                                           |
| 4. Generated types, enum parity | `npm run api:types:check` (CI `quality`); `apps/shell/src/api/contract.ts` (typecheck)                                                                                                 |
| 5. Full-stack E2E, all suites   | The four CI jobs, rehearsed from a clean copy (above)                                                                                                                                  |
| 6. Truthful Fun Facts and docs  | `registry.test.ts` and `content/architecture.test.ts` in both modes; docs and ADRs reviewed in Step 3.5                                                                                |
| 7. Design unchanged             | Layout, mascot and transition E2E specs in both modes; the owner's visual review                                                                                                       |
| 8. Both modes from one branch   | `e2e` and `e2e-static` jobs; `static-mode.spec.ts` (no `/api` request, no API or form code in the bundle)                                                                              |
| 9. No silent fallback           | `projects.spec.ts` (an API 500 shows the error, never static cards); `ProjectsPage.fullstack.test.tsx`                                                                                 |
| 10. The built mode is described | Per-mode Fun Facts (`e2e/support/site.ts` resolves them for the mode under test) and timeline notes (`ArchitecturePage*.test.tsx`)                                                     |

Fixed during validation: a unit-test race (focus after a server 422 is now awaited) and an
intermittent full-stack E2E failure in `mascot.spec.ts` (the Home measurement now waits for the
settled layout, as the other geometric checks do; 240/240 repeated runs passed).

### Step 3.3 delivery

- **The mode:** `VITE_APP_MODE` = `static` (default) or `fullstack`; anything else fails `vite`
  and `vite build`. `apps/shell/src/config/mode.ts` is the single source; builds get the value as
  a literal (`define`), so a static build drops every full-stack branch. Scripts: `dev` /
  `dev:fullstack`, `build` / `build:fullstack`, `test:e2e` (full-stack) / `test:e2e:static`.
- **Registry per mode:** each section's fields describe the static build; an optional
  `fullstack` override (`backend`, `funFact`) applies in a full-stack build through the pure
  `sectionInMode()`. Truthfulness tests run in both modes. A PostgreSQL badge exists.
- **Projects:** `projects/source.ts` gives the route its loader: the static data in a static
  build; in a full-stack build the API (typed client) as a deferred promise, rendered with
  `<Suspense>` + `<Await>`, with accessible, localised loading, empty and error (Try again)
  states and the same `ProjectCard` list. Cache: 5 minutes; failures never cached; a newer
  request can't be overwritten by an older one; **Try again always makes a fresh request**; the
  cached request isn't tied to one navigation. **No fallback to static data.**
- **The static build contains no API client and makes no `/api` request** (the API import sits
  behind the literal mode check, so not even an orphan chunk is emitted); E2E checks both.
- **Content parity:** a full-stack E2E spec compares the API's seeded projects with the static
  data after normalising both to `Project`; it runs only in the full-stack test environment,
  never as part of building or deploying the static site.
- **Copy (owner-approved):** mode-dependent Fun Facts (Home, Projects; Contact neutral), the
  Architecture timeline note per mode, and the shared project description in the static data and
  the seeds (now listing Rails).
- **CI:** the `e2e` job tests the full-stack build; a new `e2e-static` job tests the static build
  (no PostgreSQL, no Ruby).

### Step 3.2 delivery

- `tools/openapi-types/`: the isolated generator (`openapi-typescript@7.13.0`,
  `typescript@5.9.3`, its own lockfile with sha512 integrity, matching the npm registry);
  `npm run api:types:install`, `api:types` and `api:types:check` (in the CI `quality` job).
  Generation is deterministic, and the generated `apps/shell/src/api/schema.ts` compiles under
  the shell's TypeScript 6.0.3 strict settings and passes ESLint (no ignore needed).
- `apps/shell/src/api/`: `client.ts` (same-origin `getJson`/`postJson`, `ApiError`), `types.ts`,
  `projects.ts` (`fetchProjects`, `toProject`), `contract.ts` (type-only parity), `fixtures.ts`
  (typed with `satisfies`), with unit tests.
- `apps/shell/src/projects/model.ts`: the neutral `Project` view model; `content/projects.ts`
  (kept) and `ProjectCard` import it. ESLint forbids `src/api/*` in components and sections.
- ADR-0014 (frontend data access and the two modes); at that step no page used the API yet.

### Phase 3 decisions (owner, 2026-10-26)

- **Loading:** a route loader returning a deferred promise, with in-page `<Await>` states.
- **Types (A1):** the isolated, lockfile-pinned generator package, with a compile gate and a
  reported fallback.
- **Contact submission:** a route action plus `useFetcher`.
- **Cache (A3):** 5 minutes, failures never cached, Retry bypasses it, stale in-flight requests
  can't overwrite newer data.
- **E2E:** the existing `e2e` job becomes full-stack, with a dedicated `portfolio_api_e2e`
  database; rate-limit isolation by the E2E-only file store and serial real-API specs (A2).
- **Fun Facts:** a PostgreSQL badge; the privacy note and the seeded description are drafted in
  their steps for the owner's approval; the contact form goes below the channels.
- **Architecture page:** the testing and CI cards are updated instead of adding an eleventh card.
- **Two modes:** one codebase, a build-time mode, a neutral `Project` model fed by the static
  data (kept) or the API mapping, no silent fallback, the contact form in full-stack mode only,
  and content parity checked after normalising both sources to `Project`.

### Summary and readiness (recorded at the end of Phase 2)

The shell reads projects through route loaders (loading and error states in both languages),
`/api` is proxied same-origin (Vite dev server and preview), an accessible contact form with a
privacy note, Fun Facts / registry `backend: 'rails'` / Architecture page updated truthfully,
the frontend's types and fixtures checked against the OpenAPI document, and full-stack E2E in
CI. Completing it completes the **MVP**.

**Readiness (recorded at the end of Phase 2):** kept as a historical record; where Phase 3
decided otherwise, the correction is noted in brackets.

- **First task:** the Architecture timeline's v2 becomes Done (deferred from Phase 2).
- **Contract:** `services/api/docs/openapi.yaml` (OpenAPI 3.0.3; the source for the shell's
  types and fixtures). The shell needs `GET /api/v1/projects` (`{ data: Project[] }`, both
  languages, published, ordered) and `POST /api/v1/contact_messages` (flat JSON `name`,
  `email`, `message`, `locale`, `website`; 202, or 400/413/415/422/429/500 with the error
  envelope; 422 `details` are validation codes per field to translate in the shell; 429 has
  `Retry-After`). `GET /api/v1/projects/{slug}` exists but no page needs it yet.
- **Development:** `vite.config.ts` gets `server.proxy` and `preview.proxy` for `/api` →
  `http://127.0.0.1:3000` (same-origin, no CORS); Rails runs alongside (`bin/rails server`,
  PostgreSQL via Compose). Locally the proxy is a trusted peer, so the rate limits follow the
  forwarded address.
- **Shell:** a Projects route loader with loading/error states in both languages; mapping
  `technologies` → `tech` and `url` → `href` (or adopting the API's names); types checked
  against the document (`openapi-typescript` or handwritten types with a fixture test, to
  decide) [decided in Step 3.2: generated types, ADR-0014]; a test that the shell knows every
  `Technology`, `Status` and `Locale` value; the contact form (hidden `website` field, `locale`
  from the URL, localised validation messages, a 429 message, the privacy note);
  `content/projects.ts` retired [superseded: it is kept permanently as the static mode's data,
  ADR-0014]; the seeded project description updated with the shell's text; the Contact Fun Fact,
  registry `backend: 'rails'` and the Architecture page updated truthfully.
- **CI:** a full-stack E2E job (PostgreSQL service, the Rails server, the shell preview with the
  proxy) and axe on the form.

## Phase 4 — Deployment

Started 2026-10-27. **Architecture: [ADR-0015](adr/0015-deployment-architecture.md)** (accepted
in Step 4.1): **Stage A**, the full-stack build for about three months on Render (preferred,
subject to verification) as one Docker service in which Rails serves the shell and `/api` from
one origin, with managed PostgreSQL; **Stage B**, the static build permanently on Cloudflare
Pages; the same custom domain in both stages; one repository, one `main` branch, both build
modes and all four CI jobs kept after the cutover. The static site is deployed and tested on a
preview before Stage A, as a ready fallback.

**Spending rule:** no cloud resource, purchase or plan change without the owner's explicit
approval, recorded in the spending log below. **US$ 20/month** is the planning ceiling for Stage
A, excluding the domain; it is a budget, not a limit any provider enforces. Prices and provider
capabilities are verified in Step 4.5 before anything is provisioned.

| #    | Step                                                                                                                                                               | Cost              | Status           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------- |
| 4.0  | Home layout shift under reduced motion (separate from infrastructure)                                                                                              | —                 | Done (`13938b0`) |
| 4.1  | Deployment architecture: ADR-0015 and documentation                                                                                                                | —                 | Done (`2653ba5`) |
| 4.2  | Production container: Dockerfile, Rails serves the shell (SPA fallback), CI image build and smoke test                                                             | —                 | Ready for review |
| 4.3  | Production hardening: `config.hosts`, `trusted_proxies`, security headers and CSP, IP-free request logs, database-aware `/up`                                      | —                 | Planned          |
| 4.4  | Static-host readiness: `_headers`, a Cloudflare Pages preview (`*.pages.dev`), static E2E against it                                                               | Free              | Planned          |
| 4.5  | Provider verification (no paid resources): prices, billing alerts, cancellation, rollback, region, PostgreSQL 18, backups, scheduled jobs, proxy headers; go/no-go | Free              | Planned          |
| 4.6  | Provision Stage A on the provider's URL; verify the client-IP chain; production smoke                                                                              | Paid (approved)   | Planned          |
| 4.7  | Operations: backups and a restore drill, the retention procedure (scheduled or manual, decided here), the monthly review runbook, monitoring                       | Within budget     | Planned          |
| 4.8  | Privacy and logging review: the privacy note checked against the real setup                                                                                        | —                 | Planned          |
| 4.9  | Go live: domain purchase (approved), DNS, production smoke; Architecture v4 updated                                                                                | Domain (approved) | Planned          |
| 4.10 | Stage B cutover: DNS to Cloudflare Pages, static E2E against the domain; 7-day rollback window                                                                     | —                 | Planned          |
| 4.11 | Retire the backend: message review (export or delete), resources deleted, $0 bill confirmed, deployment history                                                    | Ends costs        | Planned          |

Each step is planned in detail and approved before it starts.

### Spending log

Every approved expense (purchases, paid plans, upgrades), recorded when approved.

| Date | Item | Provider | Price | Approved by |
| ---- | ---- | -------- | ----- | ----------- |

_None yet._

### Step 4.0 — Home layout shift under reduced motion

- **Defect:** in full-stack builds, the Home "What I do" section jumped down a moment after the
  first paint (24px at 1280px; more at 1024px, where the stage is taller), for visitors with
  `prefers-reduced-motion: reduce`.
- **Root cause:** the global reduced-motion rule set `transition-duration: 0.01ms !important`
  on every element. `transition-property` defaults to `all`, so every style change became a
  transition, painted from its old value until a later frame. When `useHeroExtent` applied the
  measured stage height (`--home-stage-block`), the Home spacer kept its fallback height for the
  first frames. Static builds were unaffected (their measured height equals the fallback).
- **Fix:** reduced-motion transitions take `0s` (`transition-duration` and `transition-delay`),
  so changes apply immediately. Nothing waits for `transitionend` under reduced motion (the
  header mascot jumps). No design, layout or responsive change; users without reduced motion
  are unaffected.
- **Tests:** `apps/shell/src/styles/global.test.ts` (the rule itself) and
  `e2e/tests/layout-stability.spec.ts` (both modes; en and pt-BR; 1024, 1280 and 1440px; motion
  on and off): on the first frame the spacer equals the measured height plus `--space-3`, and
  "What I do" never moves down after the first paint. Against the old rule the spec fails in
  every reduced-motion case.
- **Known, separate, accepted (owner's decision, 2026-10-27): the font-swap reflow.** The app
  renders before Inter loads, so text first wraps in the fallback font and re-wraps when Inter
  arrives (both modes; measured on Linux with the DejaVu fallback: up to CLS 0.039 at 1024px,
  the hero text moving up about 28px; other systems' fallbacks are closer to Inter). It stays
  within the "good" CLS range (< 0.1). Measured alternatives, **not adopted**: preloading the
  Latin Inter file removes it (CLS 0) but delays first paint on slow networks (about +19% on Fast
  3G, +25% at 400 kbps); also waiting for the font before rendering (1 s cap) costs about +24%
  and +32%. Revisit if the trade-off changes.

### Step 4.1 — Deployment architecture documentation

- **ADR-0015** records the two-stage architecture, the deployment lifecycle, the rollback
  strategy (provider rollback or revert in Stage A; the static site as a fallback at any time;
  DNS back to the backend within the 7-day window after the cutover), the alternatives (the
  earlier VPS with Docker Compose and Caddy plan, Fly.io + Neon, Railway, free tiers, proxies,
  other static hosts, CORS) and the open items to verify before provisioning.
- **Owner's decisions (2026-10-27):** ADR-0015 listed under the Architecture page's "Key
  decisions" (a decision, not a deployment: timeline v4 stays Planned); the refined steps
  4.1–4.11; the US$ 20/month planning ceiling; the retention-procedure decision deferred to Step
  4.7 (a verified procedure is required before going public either way); the spending log.
- Documentation corrected for the decision: `CLAUDE.md` (hosting, Phase 4 rules), ADR-0002,
  0011 and 0014, both READMEs; the prerequisites below rewritten for the approved architecture.

### Step 4.2 — Production container and single-origin serving

- **Image** (root `Dockerfile`, allowlist `.dockerignore`): three stages: the shell's
  `build:fullstack` on `node:22.23.3-slim` (`npm ci` for the shell workspace, `--ignore-scripts`;
  the build fails if any source map appears), the production gems on `ruby:4.0.9-slim` (without
  `development`, `test`, `e2e`; bootsnap precompiled), and a runtime with `libpq5` only, no Node,
  no compilers, no specs, no secrets; a non-root user (uid 1000) that can write only `tmp/` and
  `log/`; base images pinned by tag and digest; about 310 MB. `CMD` runs Puma only.
- **Single origin:** the `ShellAssets` Rack middleware (enabled by `SHELL_ROOT`; no new gem)
  serves the shell: `/api`, `/api/…` and `/up` always reach Rails (API errors stay JSON);
  other methods go to Rails; files are served with correct types (`text/javascript`,
  `font/woff2`, …), `/assets/*` immutable for a year, `index.html` with `no-cache`, root files
  for an hour; page URLs get `index.html` (200, the shell routes them, as on Cloudflare Pages);
  missing files, `*.map`, dot segments (`/.env`), server-side names (`/Gemfile`,
  `/config/…`) and traversal attempts are a plain 404; only files inside `SHELL_ROOT` (after
  symlinks) are ever served. Rails' own static server is off in production.
- **Release command:** `services/api/bin/release` (`db:migrate` then `db:seed`; production
  only unless `ALLOW_RELEASE=1`; stops at the first failure) runs once per deploy as a separate
  command, never on web startup.
- **Tests:** RSpec for the middleware (types, caching, fallback, refused and sensitive paths,
  traversal, symlinks, methods) and for the API behind it (unchanged JSON errors);
  `scripts/smoke-image.sh` (image contents, release fail-fast and success as the non-root user,
  no migration on start, shell deep links, caching, MIME types, HEAD, 304, missing assets,
  source maps, sensitive paths, API data and errors, contact 202/422) on a throwaway
  `portfolio_smoke` database it creates and drops; a read-only browser smoke (`e2e/smoke`,
  `SMOKE_BASE_URL`) reusable against the real URLs in 4.6 and 4.9.
- **CI:** a fifth job, `image`, builds the image and runs the smoke test with the browser smoke
  against a disposable PostgreSQL service; the image is never pushed. The four existing jobs are
  unchanged.
- **Not in this step (4.3):** `config.hosts`, `trusted_proxies`, the CSP and security headers,
  IP-free request logs, a database-aware `/up`; no compression yet.

## Phase 4 prerequisites (before public deployment)

Rewritten in Step 4.1 for the approved architecture (ADR-0015; the first version, recorded in
Step 3.5, assumed a VPS with Docker Compose and Caddy). Items marked **mandatory** are done and
verified before the site is public; each names the step that delivers it.

**Security**

- **Secrets (mandatory, 4.3 and 4.6):** `SECRET_KEY_BASE` and `DATABASE_URL` only in the
  provider's environment; the app reads no Rails credentials, so no `RAILS_MASTER_KEY`, and
  `config/master.key` is never uploaded; nothing secret in the image, `render.yaml` or the
  repository.
- **Hosts and client IPs (mandatory, 4.3, verified on the provider in 4.6):** `config.hosts`
  limited to the domain(s); `config.action_dispatch.trusted_proxies` set to the **verified**
  provider proxy hop, so `client_ip` keys rate limits on the visitor's address; a test that a
  forged `X-Forwarded-For` from outside can't change the key; Cloudflare DNS stays DNS-only in
  Stage A (one proxy hop).
- **Security headers (mandatory, 4.3 and 4.4):** HSTS (from `force_ssl`), a Content Security
  Policy designed for the shell, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` and `frame-ancestors`, the same in both stages (`_headers` on Pages).
- The database is reachable on the provider's private network only; dependency audits stay in
  CI; one instance and one Puma process (the in-memory rate limits depend on it, ADR-0013).

**Backups and restore**

- **Backups (mandatory, verified in 4.5):** the managed database's daily backups and
  point-in-time recovery, with their retention and behaviour confirmed on the chosen plan.
- **Restore drill (mandatory, 4.7):** a backup restored into a scratch database and checked
  before going public.
- Backup retention must not keep deleted contact messages longer than the retention policy
  allows.

**Contact-message retention**

- **A verified retention and deletion procedure (mandatory, 4.7):** `bin/rails
contact_messages:purge` (12 months; `DRY_RUN=1` first). Whether it runs as a scheduled job
  (about $1/month at research time) or as a documented manual procedure is decided in 4.7: with
  a three-month Stage A no message reaches 12 months unless Stage A is extended.
- **The privacy note never claims automatic deletion** unless a purge is actually scheduled and
  working.

**Operational review (monthly, owner, about 15 minutes; runbook in 4.7)**

1. Read new messages in a **private** provider shell with `bin/rails contact_messages:list`
   (`LIMIT=20`, `SINCE=YYYY-MM-DD`). It prints personal data: never copy it into tickets, chats,
   logs or the repository. No automatic forwarding to a personal inbox.
2. Check the retention procedure (purge output, or the manual run's date).
3. Check the deploy and health status (`/up`).
4. Check the bill and bandwidth against the budget.
5. Confirm the backups are recent.

**Cost controls**

- **Budget (mandatory before provisioning, 4.5):** US$ 20/month planning ceiling for Stage A,
  excluding the domain; billing alerts or limits configured if the provider offers them
  (verified in 4.5; none assumed).
- One instance, no autoscaling, no paid add-ons.
- **Every expense approved and recorded** in the spending log (Phase 4 section).
- The Stage A end date is in the runbook, with a reminder two weeks before it; the domain's
  auto-renewal is decided at purchase (4.9).

**Privacy and logging (mandatory review, 4.8)**

- Production request logs without client IPs (the "Started … for <ip>" line; 4.3); contact
  values stay filtered (ADR-0013); errors are reported through the provider's logs only.
- The privacy note checked against the real setup: host and region, what is stored, logs and
  their retention, backups, the retention procedure; updated if needed.
- No new third-party services (email delivery, error tracking, CAPTCHA) unless approved.

**Retiring the backend (4.10 and 4.11)**

1. The static site, already validated on its preview, takes the domain (DNS); the static E2E
   suite runs against it (no `/api` requests).
2. **Review the stored contact messages** with `bin/rails contact_messages:list`: securely
   export **only** legitimate messages that still need a follow-up (encrypted, outside the
   repository, themselves deleted under the policy); delete everything else.
3. After 7 days of a stable Stage B: delete the scheduled job (if any), the web service, the
   database and its backups; confirm a $0 forecast.
4. Record the deployment history (dates, what ran where) in the README and ROADMAP. The Fun
   Facts and the Architecture note already follow the build mode.

**Open questions (decided in the steps named):** the domain name (4.9); the region (4.5, affects
the privacy note); the retention procedure (4.7); whether pages are prerendered for SEO (not
planned in Phase 4).

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
