# Development guide

How to install, run, test and build the portfolio. The project's rules and conventions for
maintainers live in [`CLAUDE.md`](../CLAUDE.md); the Rails API has its own guide in
[`services/api/README.md`](../services/api/README.md).

## Repository layout

```
apps/shell/   The React + TypeScript shell (the website)
services/api/ The Ruby on Rails API (full-stack mode, runs locally)
e2e/          Playwright end-to-end and accessibility tests
infra/        Docker Compose (PostgreSQL for local development)
deploy/       Cloudflare Pages files for the static site (headers, asset 404)
scripts/      Build helpers (Pages preparation, the production image smoke test)
tools/        Isolated, pinned tools (OpenAPI type generator, Pages emulator)
.github/      GitHub Actions CI
docs/         Roadmap, ADRs, this guide, the art brief and approved art sources
```

## Requirements

- Node.js 22 LTS (see `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- npm 10+ (ships with Node 22)
- For full-stack mode only: Ruby from `services/api/.ruby-version` (via asdf) and Docker

## Getting started

```bash
nvm use
npm install
```

```bash
npm run dev              # shell dev server at http://localhost:5173 (static mode)
npm run dev:fullstack    # the same in full-stack mode (with `bin/rails server` on port 3000)
npm run lint             # ESLint (type-aware + accessibility rules)
npm run typecheck        # TypeScript strict type-check
npm test                 # Vitest + React Testing Library
npm run format:check     # Prettier
npm run content:check    # fails if any unconfirmed todo() content remains
npm run build            # production build to apps/shell/dist (the static site)
npm run build:fullstack  # the full-stack site (VITE_APP_MODE=fullstack)
npm run build:pages      # the static site prepared for Cloudflare Pages
npm run api:types        # regenerate the shell's API types from the OpenAPI contract
                         # (first: npm run api:types:install; CI checks them with api:types:check)
```

Root scripts delegate to npm workspaces.

## Two build modes

One codebase builds either site, chosen at build time by `VITE_APP_MODE`
([ADR-0014](adr/0014-frontend-data-access.md)). The pages, design and languages are the same;
only the data source and the contact form differ.

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

### The static site without a backend

The static build is a complete site: no API, no database and no environment variables.

1. `npm ci && npm run build` (static is the default mode), or `npm run build:pages` for
   Cloudflare Pages, the chosen host: it adds the Pages headers and 404 handling
   ([`deploy/cloudflare-pages`](../deploy/cloudflare-pages/README.md)) and refuses any build that
   isn't static.
2. Serve `apps/shell/dist/` from any static host, with an **SPA fallback**: every path that is
   not a file serves `index.html` (deep links such as `/pt-br/contact` and the in-app 404 page
   need it).
3. Check it: every page loads in both languages, the Contact page shows the channels and no
   form, and the browser makes no `/api` request (`npm run test:e2e:static` checks the same
   things against the local build, served as Cloudflare Pages would; install its emulator once
   with `npm run pages:emulator:install`).

### Full-stack mode (runs locally)

Needs Ruby from `services/api/.ruby-version` (asdf), Docker, and the one-time API setup in
[`services/api/README.md`](../services/api/README.md) (`.env` files from their `.env.example`).

```bash
docker compose -f infra/compose.yaml up -d --wait   # PostgreSQL on 127.0.0.1:5432
(cd services/api && bin/setup --skip-server)          # gems, development and test databases
(cd services/api && bin/rails server)                 # the API on http://localhost:3000
npm run dev:fullstack                                 # the shell on http://localhost:5173, /api proxied
```

During development, the dev server proxies `/api` to `http://127.0.0.1:3000`; set
`API_PROXY_TARGET` to change it. To load the site's projects into the development database again
after they change: `(cd services/api && bin/rails db:seed)`.

### The production image (runs locally)

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

## End-to-end tests

```bash
npm run test:e2e         # Playwright + axe against the full stack (both languages)
npm run test:e2e:static  # the same suite against the static build, served as Cloudflare Pages would

# The deployed static site (read-only, starts nothing)
E2E_MODE=static E2E_STATIC_SERVER=remote E2E_BASE_URL=https://bruno-guimaraes.pages.dev npm run e2e -w e2e
SMOKE_BASE_URL=https://bruno-guimaraes.pages.dev npx playwright test -c e2e/playwright.smoke.config.ts
```

The full-stack suite starts the Rails API in its `e2e` environment (port 3100, its own database
`portfolio_api_e2e`, prepared and reset on every run) and the shell's production build with
`vite preview` (port 4173), which proxies `/api` to it. It needs PostgreSQL running
(`docker compose -f infra/compose.yaml up -d --wait`) and the API's one-time setup. Both ports
must be free: running servers are never reused.

Browsers are a one-time setup: `npx playwright install chromium` (on Linux/WSL also
`sudo npx playwright install-deps chromium`). The static suite also needs the Pages emulator once:
`npm run pages:emulator:install`.

## Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
([ADR-0010](adr/0010-continuous-integration.md)) runs on every push to `main` and every pull
request, with five jobs:

- **`quality`:** formatting, lint, types, unit tests, the content gate, API types and the Pages
  build
- **`e2e`:** the full-stack E2E suite with axe
- **`e2e-static`:** the static suite under the Cloudflare Pages emulator
- **`api`:** the Rails API's `bin/ci` (RuboCop, audits, Brakeman, RSpec against PostgreSQL)
- **`image`:** builds the production image and smoke-tests it

CI calls the same npm scripts and `bin/ci` you run locally.
