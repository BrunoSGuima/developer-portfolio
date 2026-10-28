# Developer Portfolio

[![CI](https://github.com/BrunoSGuima/developer-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/BrunoSGuima/developer-portfolio/actions/workflows/ci.yml)

An interactive developer portfolio that feels like one website but is powered by multiple
independently developed applications. The portfolio demonstrates engineering skills —
architecture, testing, microfrontends, backend services — instead of just listing them.

A chibi mascot guides visitors through the site, and a persistent **Fun Fact** banner explains
the real technology stack behind each section. Light and dark themes follow the system until the
visitor picks one ([ADR-0017](./docs/adr/0017-light-and-dark-themes.md)).

> **Status:** Phase 1, the React frontend foundation, is done (shell, routing, Fun Fact,
> content, microfrontend host, illustrated Home and mascot, responsive layout, English and
> Brazilian Portuguese under `/pt-br`, page transitions, Playwright E2E, GitHub Actions CI).
> Phase 2 (Ruby on Rails API + PostgreSQL) is done: a read-only Projects API and contact
> messages in [`services/api`](./services/api/README.md), tested on their own. Phase 3
> (integration) is done, and with it the MVP: in a full-stack build the Projects page loads from
> the API and the Contact page sends messages to it; a static build runs with no backend at all.
> Phase 4 (deployment) is in progress; nothing is published yet. The public site will be the
> **static** build on Cloudflare Pages
> ([ADR-0016](./docs/adr/0016-static-first-deployment.md)); the Rails API and PostgreSQL are
> complete and tested, and run **locally** in the optional full-stack mode, so the portfolio has
> no recurring server cost. See [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Roadmap

| Phase | Scope                                                                                | Status      |
| ----- | ------------------------------------------------------------------------------------ | ----------- |
| 1     | React frontend foundation: shell, static data, mascot, Fun Fact, en/pt-BR, tests, CI | Done        |
| 2     | Ruby on Rails API + PostgreSQL: projects, contact messages, RSpec, OpenAPI           | Done        |
| 3     | Frontend/backend integration, full-stack validation and MVP completion               | Done        |
| 4     | Public release of the static site on Cloudflare Pages; the full stack stays local    | In progress |
| 5     | Vue 3 microfrontend mounted by the React shell                                       | Planned     |
| 6     | Python FastAPI service + interactive quiz                                            | Planned     |
| 7     | Background jobs (Redis + Sidekiq)                                                    | Planned     |
| 8     | AI Lab and future expansion                                                          | Planned     |

## Repository layout

```
apps/        Frontend applications (React shell in Phase 1, Vue app in Phase 5)
services/    Backend services (Rails API in services/api since Phase 2, FastAPI in Phase 6)
e2e/         Playwright end-to-end tests spanning all apps
infra/       Docker Compose (PostgreSQL for local development)
deploy/      Cloudflare Pages files for the static site (headers, asset 404)
.github/     GitHub Actions CI (lint, types, unit, build, E2E + axe, production image)
docs/adr/    Architecture Decision Records
docs/assets/ Design references (mascot reference image)
```

The Rails API has its own toolchain (Ruby, Bundler, Docker for PostgreSQL); see
[`services/api/README.md`](./services/api/README.md) for its setup and commands.

## Requirements

- Node.js 22 LTS (see `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- npm 10+ (ships with Node 22)

## Getting started

```bash
nvm use
npm install
```

```bash
npm run dev         # shell dev server at http://localhost:5173 (static mode)
npm run dev:fullstack  # the same in full-stack mode (with `bin/rails server` on port 3000)
npm run lint        # ESLint (type-aware + accessibility rules)
npm run typecheck   # TypeScript strict type-check
npm test            # Vitest + React Testing Library
npm run build       # production build to apps/shell/dist (the static site)
npm run build:fullstack  # the full-stack site (VITE_APP_MODE=fullstack)
npm run api:types   # regenerate the shell's API types from the OpenAPI contract
                    # (first: npm run api:types:install; CI checks them with api:types:check)
```

```bash
npm run test:e2e    # Playwright E2E + axe against the full stack (both languages)
npm run test:e2e:static  # the same suite against the static build, with no API
```

CI (`.github/workflows/ci.yml`, ADR-0010) runs the same commands on every push to `main` and
every pull request, plus `npm run content:check` (no unconfirmed `todo()` content), and the
Rails API's `bin/ci` against a PostgreSQL service container.

The E2E suite runs against the full stack: Playwright starts the Rails API in its `e2e`
environment (port 3100, its own database `portfolio_api_e2e`, prepared and reset on every run) and
the shell's production build with `vite preview` (port 4173), which proxies `/api` to it. It
needs PostgreSQL running (`docker compose -f infra/compose.yaml up -d --wait`), the API's one-time
setup ([`services/api/README.md`](./services/api/README.md)) and a browser once:
`npx playwright install chromium` (on Linux/WSL also `sudo npx playwright install-deps chromium`).
Both ports must be free: running servers are never reused. During development, the dev server
proxies `/api` to `http://127.0.0.1:3000` (a `bin/rails server`); set `API_PROXY_TARGET` to change
it. Root scripts delegate to npm workspaces.

## Deployment

The public site is the **static build only**, on Cloudflare Pages Free
([ADR-0016](./docs/adr/0016-static-first-deployment.md)). **Nothing is published yet**: the Pages
project is verified on a `*.pages.dev` address in Step 4.11, and the custom domain comes at
publication (Step 4.12).

The Rails API and PostgreSQL are **not deployed** and aren't operated as cloud services. They
stay fully implemented and tested in CI, and run locally (see
[Full-stack mode](#full-stack-mode-optional-runs-locally)). For a personal portfolio, a server
running around the clock wasn't worth its recurring cost. Deploying the full stack would need a
new ADR and the checklist in [`docs/ROADMAP.md`](./docs/ROADMAP.md#phase-4-prerequisites-before-publication).

## Two build modes

One codebase builds either site, chosen at build time by `VITE_APP_MODE` (ADR-0014). The pages,
design and languages are the same; only the data source and the contact form differ.

|          | Static (default, the public site)       | Full-stack (runs locally)                                            |
| -------- | --------------------------------------- | -------------------------------------------------------------------- |
| Projects | Local, typed data bundled with the page | The Rails API and PostgreSQL                                         |
| Contact  | Email, LinkedIn and GitHub              | The same, plus a form that sends to the API                          |
| Needs    | Nothing but static files                | PostgreSQL and the Rails API, same-origin under `/api`               |
| Develop  | `npm run dev`                           | `bin/rails server` (in `services/api`), then `npm run dev:fullstack` |
| Build    | `npm run build`                         | `npm run build:fullstack`                                            |
| E2E      | `npm run test:e2e:static`               | `npm run test:e2e`                                                   |

To preview a build locally: `npm run preview -w apps/shell` (port 4173; in full-stack mode it
proxies `/api` to the API like the dev server). An API failure in full-stack mode is shown as an
error with a retry; it never falls back to the static data. The Fun Facts and the Architecture
page say which mode a build is.

### Running the static site without a backend

The static build is a complete site: no API, no database and no environment variables.

1. `npm ci && npm run build` (any commit; static is the default mode), or `npm run build:pages`
   for Cloudflare Pages, the chosen host: it adds the Pages headers and 404 handling
   (`deploy/cloudflare-pages`, see its README) and refuses any build that isn't static.
2. Serve `apps/shell/dist/` from any static host, with an **SPA fallback**: every path that is
   not a file serves `index.html` (deep links such as `/pt-br/contact` and the in-app 404 page
   need it).
3. Check it: every page loads in both languages, the Contact page shows the channels and no
   form, and the browser makes no `/api` request (`npm run test:e2e:static` checks the same
   things against the local build, served as Cloudflare Pages would; install its emulator once
   with `npm run pages:emulator:install`).

## Full-stack mode (optional, runs locally)

The full-stack build shows the same site backed by a real API. It runs on your machine; it isn't
deployed.

**What it adds**

- **A Ruby on Rails 8.1 API** (Ruby 4.0, API-only) in [`services/api`](./services/api/README.md):
  - versioned under `/api/v1`, served from the same origin as the shell, with no CORS
  - described by a handwritten **OpenAPI** document
  - every request spec validates its responses against that document, and the shell's TypeScript
    client is typed from it
- **PostgreSQL 18:**
  - bilingual project data stored as JSONB, with database constraints matching the model
    validations
  - the Projects page loads from it
- **A contact form** (full-stack builds only):
  - validated on both sides, rate-limited per client and guarded by a honeypot
  - stored with minimal personal data, never logged, kept 12 months (ADR-0013)
- **Tests:**
  - RSpec with FactoryBot (models, constraints, requests, tasks), plus RuboCop, Brakeman and
    dependency audits (`bin/ci`)
  - the Playwright suite runs against the full stack too, with an end-to-end database
- **A production Docker image:**
  - Rails serves the shell and `/api` from one origin, with security headers, an enforced
    Content Security Policy, IP-free logs and a database-aware `/up`
  - built and smoke-tested in CI

**Run it with development servers**

Needs Ruby from `services/api/.ruby-version` (asdf), Docker, and the one-time API setup in
[`services/api/README.md`](./services/api/README.md) (`.env` files from their `.env.example`).

```bash
docker compose -f infra/compose.yaml up -d --wait   # PostgreSQL on 127.0.0.1:5432
(cd services/api && bin/setup --skip-server)          # gems, development and test databases
(cd services/api && bin/rails server)                 # the API on http://localhost:3000
npm run dev:fullstack                                 # the shell on http://localhost:5173, /api proxied
npm run test:e2e                                      # the E2E suite against the full stack
```

**Or run the production image locally**

Rails serves the shell's full-stack build, its page URLs and `/api` from one origin; PostgreSQL
is external (here, the Compose one).

```bash
docker build -t portfolio:local .
# Once per deploy (never on web startup): migrations and the site's projects.
docker run --rm --network host -e DATABASE_URL -e SECRET_KEY_BASE -e ALLOWED_HOSTS=localhost \
  portfolio:local bin/release
# The web service (Puma on $PORT, default 3000).
docker run --rm --network host -e DATABASE_URL -e SECRET_KEY_BASE -e ALLOWED_HOSTS=localhost \
  portfolio:local
```

`DATABASE_URL` points at a database of your choice; `SECRET_KEY_BASE` is any long random string
(`openssl rand -hex 64`). `ALLOWED_HOSTS` is required in production mode. Nothing secret is in
the image. `scripts/smoke-image.sh portfolio:local` tests an image against a PostgreSQL server
given by the `PG*` variables, on a throwaway `portfolio_smoke` database only (CI's `image` job
runs it).

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — architecture, conventions, commands and development workflow.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases, steps, acceptance criteria and evidence,
  decisions and the Phase 4 prerequisites.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records.
