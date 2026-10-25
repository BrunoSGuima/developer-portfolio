# ADR-0011: Rails API-only backend with PostgreSQL, tested on its own

- **Status:** Accepted (Phase 2, Step 2.0; exact versions decided in Step 2.1)
- **Date:** 2026-10-25

## Context

Phase 1 delivered the React frontend foundation with static content. The MVP needs a real
backend: a Ruby on Rails API with PostgreSQL (Phase 2), then its integration with the shell
(Phase 3). The owner's priorities: a backend with a real purpose (projects and contact
messages, see `docs/ROADMAP.md`), testable and complete **on its own** before any integration,
same-origin with the shell, minimal dependencies, and no Redis, Sidekiq, Vue or FastAPI yet.
Deployment is Phase 4.

## Decision

- **A Rails API-only application in `services/api/`** (`rails new --api --database=postgresql`),
  with its own `Gemfile`, outside the npm workspaces. Frameworks it doesn't use (Action
  Mailbox/Text/Cable, Active Storage, Kamal, Minitest) are skipped.
- **Development runs Ruby natively** with the version pinned in `services/api/.ruby-version`;
  **PostgreSQL runs in Docker Compose** (`infra/compose.yaml`: PostgreSQL only, named volume,
  healthcheck). Credentials are local throwaway values from a git-ignored env file
  (`.env.example` committed); `config/master.key` is never committed. Phase 2 needs no secrets.
- **Versions are not chosen yet.** Step 2.1 verifies current stable Ruby, Rails and PostgreSQL
  releases from official sources, their mutual compatibility, and support in `ruby/setup-ruby`,
  the official PostgreSQL Docker image and the gems below, then records them here.
- **Same-origin under `/api`**: the Vite dev server and preview proxy `/api` to Rails (Phase 3),
  the reverse proxy does the same in production (Phase 4). No CORS configuration and no
  `rack-cors`. The API is stateless (no cookies or sessions), so there is no CSRF surface.
- **Minimal gems**: `rspec-rails`, `factory_bot_rails`, `committee` (OpenAPI contract checks,
  ADR-0012) and `bundler-audit`, all development/test only; plus what Rails generates
  (RuboCop rails-omakase, Brakeman). Plain-Ruby serializers; no serializer, auth, admin, job or
  cache gems.
- **Testing**: RSpec + FactoryBot with transactional tests (no DatabaseCleaner); model,
  constraint, request and rake task specs. The suite needs only PostgreSQL, never the shell.
- **CI**: a separate `api` job (Step 2.2) with a PostgreSQL service container, under the same
  rules as ADR-0010 (read-only token, actions pinned to SHAs, no secrets).

## Alternatives considered

| Option                                        | Why not                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Rails in Docker for development too           | Slower feedback loop; a containerised API arrives with deployment (Phase 4).    |
| Full Rails app (views, sessions, asset tools) | The React shell owns the UI; an API-only app has less surface.                  |
| Separate origin (`api.` subdomain) with CORS  | More configuration and security surface; same-origin was decided in ADR-0002.   |
| PostgreSQL installed natively                 | Docker Compose keeps the database version pinned and identical across machines. |
| Redis / Sidekiq now                           | No MVP requirement needs background jobs or a separate cache (Phase 7).         |

## Consequences

- Two ecosystems in one repository, with clear boundaries: `services/api` has its own tooling,
  README and CI job.
- Contributors need the pinned Ruby (build libraries on Linux/WSL) and Docker.
- The API can be developed, tested and accepted (Phase 2) before the shell uses it.
