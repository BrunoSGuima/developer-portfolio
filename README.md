# Developer Portfolio

[![CI](https://github.com/BrunoSGuima/developer-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/BrunoSGuima/developer-portfolio/actions/workflows/ci.yml)

An interactive developer portfolio that feels like one website but is powered by multiple
independently developed applications. The portfolio demonstrates engineering skills —
architecture, testing, microfrontends, backend services — instead of just listing them.

A chibi mascot guides visitors through the site, and a persistent **Fun Fact** banner explains
the real technology stack behind each section.

> **Status:** Phase 1, the React frontend foundation, is done (shell, routing, Fun Fact,
> content, microfrontend host, illustrated Home and mascot, responsive layout, English and
> Brazilian Portuguese under `/pt-br`, page transitions, Playwright E2E, GitHub Actions CI).
> Phase 2 (Ruby on Rails API + PostgreSQL) is complete locally: a read-only Projects API and
> contact messages in [`services/api`](./services/api/README.md), tested on their own; the
> GitHub Actions run on its final commit is pending. Phase 3 (integration) is next. The MVP is complete once the API is
> integrated with the frontend and validated end to end (Phase 3); deployment follows. See
> [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Roadmap

| Phase | Scope                                                                                | Status  |
| ----- | ------------------------------------------------------------------------------------ | ------- |
| 1     | React frontend foundation: shell, static data, mascot, Fun Fact, en/pt-BR, tests, CI | Done    |
| 2     | Ruby on Rails API + PostgreSQL: projects, contact messages, RSpec, OpenAPI           | Done    |
| 3     | Frontend/backend integration, full-stack validation and MVP completion               | Planned |
| 4     | Production deployment (postponed until the backend is integrated), monitoring        | Planned |
| 5     | Vue 3 microfrontend mounted by the React shell                                       | Planned |
| 6     | Python FastAPI service + interactive quiz                                            | Planned |
| 7     | Background jobs (Redis + Sidekiq)                                                    | Planned |
| 8     | AI Lab and future expansion                                                          | Planned |

## Repository layout

```
apps/        Frontend applications (React shell in Phase 1, Vue app in Phase 5)
services/    Backend services (Rails API in services/api since Phase 2, FastAPI in Phase 6)
e2e/         Playwright end-to-end tests spanning all apps
infra/       Docker Compose (PostgreSQL for development); reverse proxy in Phase 4
.github/     GitHub Actions CI (lint, types, unit, build, E2E + axe)
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
npm run dev         # shell dev server at http://localhost:5173
npm run lint        # ESLint (type-aware + accessibility rules)
npm run typecheck   # TypeScript strict type-check
npm test            # Vitest + React Testing Library
npm run build       # production build to apps/shell/dist
```

```bash
npm run test:e2e    # Playwright E2E + axe against the production build (both languages)
```

CI (`.github/workflows/ci.yml`, ADR-0010) runs the same commands on every push to `main` and
every pull request, plus `npm run content:check` (no unconfirmed `todo()` content), and the
Rails API's `bin/ci` against a PostgreSQL service container.

The E2E suite needs a browser once: `npx playwright install chromium` (on Linux/WSL also
`sudo npx playwright install-deps chromium`). Root scripts delegate to npm workspaces.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — architecture, conventions, commands and development workflow.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases, Phase 1 steps, acceptance criteria and decisions.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records.
