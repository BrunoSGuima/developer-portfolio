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

**Phase 3 (integration and MVP completion) is in progress:** Step 3.0 (`84b4e4c`) is done; Step
3.1 (same-origin proxies and full-stack E2E) is ready for review. The Rails API is built and
tested, but the React pages don't use it yet; Steps 3.3–3.4 connect them.

| Phase | Scope                                                                                                                                                                 | Status                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1     | **React frontend foundation**: React + TypeScript shell, static data, mascot, Fun Fact, responsive layout, en/pt-BR, unit + E2E tests, CI                             | Done                          |
| 2     | Ruby on Rails API + PostgreSQL: projects and contact messages, security, RSpec + FactoryBot, OpenAPI contract, its own CI job; works and is tested on its own         | Done (`5f9eb59`)              |
| 3     | Frontend/backend integration, full-stack validation and **MVP completion**: the shell reads projects and sends contact messages through the API, full-stack E2E in CI | In progress                   |
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
7. Versions: chosen only after verifying stable releases, compatibility and tooling support.
   Step 2.1 chose **Ruby 4.0.9, Rails 8.1.4 and PostgreSQL 18.6** (rationale in ADR-0011).

Also required: same-origin API (no CORS), the backend testable on its own, no unnecessary gems
or premature abstractions, spam protection and privacy safeguards on the contact endpoint, the
rate limiter's limitations documented before deployment, and an explicit contract (the OpenAPI
document) instead of Rails tests reading TypeScript files. Redis, Sidekiq, Vue and FastAPI stay
out of Phase 2.

| #   | Step                       | Status           | Depends on |
| --- | -------------------------- | ---------------- | ---------- |
| 2.0 | Terminology and ADRs       | Done             | —          |
| 2.1 | Toolchain and API skeleton | Done             | 2.0        |
| 2.2 | CI `api` job               | Done             | 2.1        |
| 2.3 | Projects domain            | Done             | 2.1        |
| 2.4 | Projects API               | Done             | 2.3        |
| 2.5 | Contact messages           | Done             | 2.4        |
| 2.6 | Hardening and docs         | Ready for review | 2.5        |

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
  deferred (Phase 4 gate).

### Step 2.6 — Hardening and docs

- **Goal:** close Phase 2.
- **Work:** bundler-audit clean, parameter-filter review, the API README (setup, commands,
  endpoints), ADRs completed (versions recorded in ADR-0011), the rate limiter's limitations
  documented.
- **Delivered (ready for review), owner's decisions 2026-10-26:**
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

| #   | Status                      | Evidence                                                                                                                                                                                                                                                           |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Met                         | The README's one-time setup followed in a fresh clone (isolated Compose project and port): Ruby from `.ruby-version`, one shared password, PostgreSQL healthy, `bin/setup` created and seeded the databases, `/up` 200, the seeded project served, `bin/ci` green. |
| 2   | Met                         | 253 RSpec examples; every request spec asserts the OpenAPI contract; drift and enum/route parity specs; committee coverage fails a complete run if any documented response is never exercised.                                                                     |
| 3   | Met locally; GitHub pending | `bin/ci`: 253 examples, 0 failures; RuboCop 60 files, no offenses; Brakeman 0 warnings; bundler-audit clean; clean-copy CI rehearsal green. GitHub Actions green through Step 2.5 (`ad889d3`); the Step 2.6 run follows the owner's push.                          |
| 4   | Met                         | Validation, two rate limits (spoof-resistant key), honeypot, filtered logs (request, SQL binds, errors), no IP stored, `purge` task: covered by specs and mutation checks.                                                                                         |
| 5   | Met                         | This roadmap, `CLAUDE.md`, both READMEs and ADR-0011/0012/0013 updated in Step 2.6.                                                                                                                                                                                |

When they are met, the Architecture timeline's v2 becomes **Done**. The frontend is unchanged
during Phase 2, so this one-line content change is **scheduled as the first task of Phase 3**
(owner's decision, 2026-10-26).

## Phase 3 — Integration and MVP completion

Planned and approved on 2026-10-26. The steps below are reviewed one at a time (plan → approval →
implementation with tests → review); none starts automatically. Constraints for the whole phase:
the design, responsive behaviour and bilingual routing (`/`, `/pt-br`) stay unchanged; no new
runtime dependency; no deployment or Phase 4 infrastructure.

| #   | Step                                                   | Status           | Depends on |
| --- | ------------------------------------------------------ | ---------------- | ---------- |
| 3.0 | Architecture page and Phase 3 documentation            | Done             | —          |
| 3.1 | Same-origin development setup and full-stack E2E setup | Ready for review | —          |
| 3.2 | Typed API client                                       | Planned          | —          |
| 3.3 | Projects from the API                                  | Planned          | 3.1, 3.2   |
| 3.4 | Contact form                                           | Planned          | 3.1–3.3    |
| 3.5 | Full-stack validation, docs and MVP completion         | Planned          | 3.0–3.4    |

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
- **Delivered (ready for review), owner's decisions 2026-10-26:** the plan above was refined
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

### Step 3.3 — Projects from the API

- **Scope (decision A3):** the Projects route's lazy module provides a `loader` that returns a
  deferred promise (verified with React Router 8.4.0: navigation completes while it is pending,
  and the loader runs again on every visit); the page renders its intro and Fun Fact at once and
  the cards through `<Suspense>` + `<Await>` with accessible, localised loading, empty and error
  (Retry) states. A cache inside the loader keeps the list for **5 minutes**, never caches
  failures, is bypassed by Retry, and only stores a response if no newer request has started
  (a slow, older request can't overwrite newer data). `content/projects.ts` is retired; the
  seeds become the content source (the seeded description gets owner-approved text); the
  Projects Fun Fact and registry `backend: 'rails'` (plus a PostgreSQL badge) are updated.
- **Acceptance:** the loaded page looks identical (visual comparison); every state is
  accessible in both languages; unit and E2E tests (real API, plus a stubbed error) pass.

### Step 3.4 — Contact form

- **Scope:** an accessible form below the existing channels (a route action plus
  `useFetcher`): name, email and message with client-side checks that mirror the contract, the
  page language, the hidden honeypot, localised field errors from the validation codes, the
  pending, success, rate-limited and generic error states, and the privacy note
  (owner-approved text). The Contact Fun Fact and registry `backend: 'rails'` are updated.
- **E2E (decision A2):** real-API submissions run serially on the desktop project and reset
  the file-based rate-limit store before each test (including a genuine 429 after five
  accepted messages); language, mobile and error variants use `page.route` stubs.
- **Acceptance:** WCAG 2.2 AA (axe, keyboard, focus management), both languages, the owner's
  visual review.

### Step 3.5 — Full-stack validation, docs and MVP completion

- **Scope:** the Architecture timeline's v3 becomes Done (now allowed: sections use Rails) and the
  testing/CI or a new Rails card describes the integrated site; a clean-copy full-stack
  rehearsal; READMEs, `CLAUDE.md`, ADR-0004, 0009, 0010, 0012 and 0014; the acceptance evidence
  below. The MVP is complete once GitHub CI is green on this step.

### Phase 3 acceptance criteria

1. The Projects page shows API data in English and Portuguese, with accessible loading, empty and
   error states; no static project data remains.
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

### Summary and readiness (recorded at the end of Phase 2)

The shell reads projects through route loaders (loading and error states in both languages),
`/api` is proxied same-origin (Vite dev server and preview), an accessible contact form with a
privacy note, Fun Facts / registry `backend: 'rails'` / Architecture page updated truthfully,
the frontend's types and fixtures checked against the OpenAPI document, and full-stack E2E in
CI. Completing it completes the **MVP**.

**Readiness (recorded at the end of Phase 2):**

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
  decide); a test that the shell knows every `Technology`, `Status` and `Locale` value; the
  contact form (hidden `website` field, `locale` from the URL, localised validation messages,
  a 429 message, the privacy note); `content/projects.ts` retired; the seeded project
  description updated with the shell's text; the Contact Fun Fact, registry `backend: 'rails'`
  and the Architecture page updated truthfully.
- **CI:** a full-stack E2E job (PostgreSQL service, the Rails server, the shell preview with the
  proxy) and axe on the form.

## Before public deployment (Phase 4 gates)

- A practical notification or message-retrieval solution for contact messages.
- The 12-month retention period reviewed.
- Rate limiting backed by a store shared by all API processes, with correct client IPs behind
  the reverse proxy (ADR-0013 lists the current limitations).
- The privacy note published with the contact form.
- **Reverse proxy and client IPs:** the API is never reachable directly, only through the proxy
  (Caddy); the proxy overwrites `X-Forwarded-For` with the real client address and drops
  `Client-IP`; `config.action_dispatch.trusted_proxies` matches the deployment (the rate-limit
  key believes forwarded headers only from trusted peers); the application server sees the
  proxy as a real IP peer (not a Unix socket, which would put every visitor under the shared
  `unknown` key). A request-body limit at the proxy.
- **Rails production settings:** `config.hosts`, secrets (`SECRET_KEY_BASE` or the master key)
  and `DATABASE_URL` from the environment, one database role per service.
- **Logging:** retention, and whether to keep client IPs in request logs ("Started … for
  <ip>"); error reporting.
- **Operations:** scheduled retention purge, backups, `/up` monitoring, the production image
  (with YJIT).

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
