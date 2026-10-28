# ADR-0011: Rails API-only backend with PostgreSQL, tested on its own

- **Status:** Accepted (Phase 2, Step 2.0; versions recorded in Step 2.1; Phase 2 completed in Step 2.6)
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
- **Versions** (verified in Step 2.1, 2026-10-25, from official release information):
  - **Ruby 4.0.9** (`.ruby-version`). 4.0 and 3.4 are both in normal maintenance; 4.0 is
    supported about a year longer (≈ March 2029). 4.0.9 / 3.4.12 / 3.3.13 fix four Onigmo
    regexp CVEs, so only the newest patch is acceptable. Rails 8.1 requires Ruby ≥ 3.2; no
    official Rails test matrix listing Ruby 4.0 was found, so 4.0.9 passed a **compatibility
    gate**: the generated app installs, boots and passes RSpec, RuboCop, Brakeman and
    bundler-audit with no deprecation warnings (`RUBYOPT=-W:deprecated`). Fallback: 3.4.12.
    Both are available in ruby-build (asdf) and `ruby/setup-ruby`.
  - **Rails 8.1.4**: the only line with security support into late 2027 (until 2027-10-10;
    8.0 ends 2026-11-07). Its bug-fix window ended 2026-10-10, so an upgrade to the next Rails
    line is planned for 2027.
  - **PostgreSQL 18.6** (`postgres:18.6-trixie`, Debian rather than Alpine for glibc
    collations): supported until 2030-11. The `pg` gem (1.7) ships precompiled Linux builds
    with libpq, so no system PostgreSQL client libraries are needed.
- **Configuration**: `infra/.env` (the container) and `services/api/.env` (the connection,
  loaded by `dotenv` in development and test only) are git-ignored copies of committed
  `.env.example` files, set up once with one random password. PostgreSQL is published on
  `127.0.0.1` only. Rails' encrypted credentials infrastructure is kept (`master.key` ignored).
  Action Mailer and Active Job are kept as standard components, with no delivery, workers or
  queues configured.
- **Same-origin under `/api`**: the Vite dev server and preview proxy `/api` to Rails (Phase 3),
  and the full-stack production image serves the shell and the API from one origin, with Rails (run locally; the public site is static, ADR-0016). No CORS configuration and no
  `rack-cors`. The API is stateless (no cookies or sessions), so there is no CSRF surface.
- **Minimal gems**: `rspec-rails`, `factory_bot_rails`, `dotenv`, `committee` (OpenAPI
  contract checks, ADR-0012, from Step 2.4) and `bundler-audit`, all development/test only; plus what Rails generates
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

**End-to-end environment (Phase 3, Step 3.1):** a fourth Rails environment, `e2e`, exists only
for the Playwright suite: based on development, with production-style JSON errors, its own
database `portfolio_api_e2e` and a file-based rate-limit store at a fixed path. It is started
only by `bin/e2e-server`; a dedicated environment (rather than development with another
database) keeps Rails' database tasks away from the test database.

## Consequences

- Two ecosystems in one repository, with clear boundaries: `services/api` has its own tooling,
  README and CI job.
- Contributors need the pinned Ruby (build libraries on Linux/WSL) and Docker.
- The API can be developed, tested and accepted (Phase 2) before the shell uses it. This held:
  Phase 2 was completed and verified (Step 2.6) with the shell unchanged; the README's setup
  was rehearsed in a fresh clone.
- Rails 8.1's bug-fix window ended on 2026-10-10 (security fixes until 2027-10-10): plan the
  upgrade to the next Rails line in 2027. The contract stays OpenAPI 3.0.3 until committee
  releases its 3.1 support (ADR-0012).
