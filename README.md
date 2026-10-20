# Developer Portfolio

An interactive developer portfolio that feels like one website but is powered by multiple
independently developed applications. The portfolio demonstrates engineering skills —
architecture, testing, microfrontends, backend services — instead of just listing them.

A chibi mascot guides visitors through the site, and a persistent **Fun Fact** banner explains
the real technology stack behind each section.

> **Status:** Phase 1 (React MVP) — Steps 0–7 complete (shell, routing, Fun Fact, content,
> microfrontend host, illustrated Home and mascot). Step 8 (responsive layout) is awaiting visual
> review; Step 9 adds English and Brazilian Portuguese. See [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Roadmap

| Phase | Scope                                                                        | Status      |
| ----- | ---------------------------------------------------------------------------- | ----------- |
| 1     | React + TypeScript MVP shell, static data, mascot, Fun Fact, en/pt-BR, tests | In progress |
| 2     | Ruby on Rails API + PostgreSQL                                               | Planned     |
| 3     | Vue 3 microfrontend mounted by the React shell                               | Planned     |
| 4     | Python FastAPI service + interactive quiz                                    | Planned     |
| 5     | Background jobs (Redis + Sidekiq)                                            | Planned     |
| 6     | Production deployment, CI/CD, monitoring                                     | Planned     |
| 7     | AI Lab and future expansion                                                  | Planned     |

## Repository layout

```
apps/        Frontend applications (React shell in Phase 1, Vue app in Phase 3)
services/    Backend services (Rails API in Phase 2, FastAPI in Phase 4)
e2e/         Playwright end-to-end tests spanning all apps
infra/       Docker Compose and reverse proxy configuration (Phase 2+)
docs/adr/    Architecture Decision Records
docs/assets/ Design references (mascot reference image)
```

Only `apps/shell` and `docs/` exist so far; the other directories are created by the step that
needs them.

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

Root scripts delegate to npm workspaces. `npm run test:e2e` becomes available in Step 11.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — architecture, conventions, commands and development workflow.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — phases, Phase 1 steps, acceptance criteria and decisions.
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records.
