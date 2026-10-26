# Portfolio API (Ruby on Rails)

The portfolio's backend (Phase 2, ADR-0011): an **API-only** Rails application with PostgreSQL,
tested with RSpec. It is independent of the npm workspaces and of the React shell: it runs and
is tested on its own. Public endpoints will live under `/api/v1` (ADR-0012), served same-origin
with the shell through a proxy (Phase 3 Vite proxy, Phase 4 reverse proxy), so there is no CORS
configuration.

**Status (Step 2.4):** the toolchain, the database, the test setup, Rails' `GET /up` health
check, the **Projects domain** (models, constraints, seeds) and the read-only **Projects API**.

| Component    | Version                                          | Pinned in                                      |
| ------------ | ------------------------------------------------ | ---------------------------------------------- |
| Ruby         | 4.0.9                                            | `.ruby-version` (read by asdf, Bundler and CI) |
| Rails        | 8.1.4                                            | `Gemfile.lock`                                 |
| PostgreSQL   | 18.6 (`postgres:18.6-trixie`, Docker)            | `infra/compose.yaml`                           |
| Test tooling | RSpec (rspec-rails 8.0), FactoryBot 6.5          | `Gemfile.lock`                                 |
| Quality      | RuboCop (rails-omakase), Brakeman, bundler-audit | `Gemfile.lock`                                 |

## Requirements

- Linux or WSL2 (Ubuntu 22.04 tested). Ruby's build dependencies:
  `build-essential autoconf libssl-dev libyaml-dev zlib1g-dev libffi-dev libgmp-dev
libreadline-dev libncurses-dev` (install once with `sudo apt-get install …` if missing).
  No `libpq-dev` is needed: the `pg` gem ships a precompiled build that bundles libpq.
- [asdf](https://asdf-vm.com/) with the Ruby plugin, set to read `.ruby-version`: `~/.asdfrc`
  must contain `legacy_version_file = yes` **exactly once** (see Troubleshooting).
  rbenv, mise or chruby work too; they all read `.ruby-version`.
- Docker Engine with Compose v2 (for PostgreSQL only; Rails runs natively).

## Setup (once)

Commands run from the **repository root** unless noted.

1. Install Ruby (into asdf only; your global Ruby is not changed):

   ```bash
   asdf plugin update ruby        # refresh the list of Ruby versions
   asdf install ruby 4.0.9        # compiles Ruby, a few minutes
   ```

2. Create the two local env files with **one random password** (both files are git-ignored;
   never commit them):

   ```bash
   cp infra/.env.example infra/.env
   cp services/api/.env.example services/api/.env
   pw=$(openssl rand -hex 16)
   sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$pw/" infra/.env
   sed -i "s/^DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$pw/" services/api/.env
   unset pw
   chmod 600 infra/.env services/api/.env
   ```

   `infra/.env` configures the PostgreSQL container; `services/api/.env` tells Rails how to
   connect (loaded by the `dotenv` gem in development and test). User, port and password must
   match in both.

3. Start PostgreSQL and set up the app:

   ```bash
   docker compose -f infra/compose.yaml up -d --wait
   cd services/api
   bin/setup --skip-server        # bundle install, creates (and seeds) the dev DB, creates the test DB
   ```

## Daily use

```bash
# Database (from the repository root)
docker compose -f infra/compose.yaml up -d --wait   # start; waits until healthy
docker compose -f infra/compose.yaml ps             # status
docker compose -f infra/compose.yaml logs postgres  # logs
docker compose -f infra/compose.yaml down           # stop; the data stays in the volume

# API (from services/api)
bin/rails server                 # http://localhost:3000 ; curl -i localhost:3000/up
bundle exec rspec                # the test suite
bin/ci                           # every check: setup, RuboCop, bundler-audit, Brakeman, RSpec
bin/rubocop                      # style only (bin/rubocop -a to autocorrect)
```

`docker compose -f infra/compose.yaml down -v` also **deletes the volume and all local data**.
Only use it on purpose.

## Configuration and secrets

- `.env` files are git-ignored (only `.env.example` is committed). No password is committed
  anywhere; the compose file refuses to start without `POSTGRES_PASSWORD`.
- PostgreSQL is published on `127.0.0.1` only.
- `config/database.yml` reads `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME` and
  `DATABASE_PASSWORD`. Databases: `portfolio_api_development` and `portfolio_api_test`.
  Production (Phase 4) will use `DATABASE_URL`.
- Rails' encrypted credentials are kept (`config/credentials.yml.enc`); `config/master.key` is
  git-ignored and must **never** be committed. Nothing secret is stored in them yet.
- Action Mailer and Active Job are available but not configured: no email delivery, workers
  or queues yet.

## Endpoints

Read-only, JSON, under `/api/v1`. **The contract is [`docs/openapi.yaml`](docs/openapi.yaml)**
(OpenAPI 3.0.3, ADR-0012): change it first; every request spec validates against it.

| Request                       | Response                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /api/v1/projects`        | 200 `{ "data": [Project] }`: published projects, ordered by position then slug                |
| `GET /api/v1/projects/{slug}` | 200 `{ "data": Project }`; **404** for unknown, unpublished or badly formed slugs (same body) |
| Other methods on those paths  | **405** with `Allow: GET, HEAD`                                                               |
| Any other path under `/api`   | **404**                                                                                       |

There are no format suffixes: `/api/v1/projects/valid-slug.json` or `/api/v1/projects/a.b` is a
404 (the whole segment is treated as the slug), never the project before the dot.

A project is `slug`, `name` and `description` (both languages), `status`, `technologies` (ids,
badge order) and `links` (`label` in both languages, `url`), in display order. Errors are
always `{ "error": { "code", "message", "details" } }`.

```bash
curl -s localhost:3000/api/v1/projects
curl -s localhost:3000/api/v1/projects/developer-portfolio
```

**Unexpected errors:** in **development** Rails shows its detailed error response (exception and
backtrace) to help debugging. In **production** `config.exceptions_app` (`Api::ErrorsController`)
renders the same error envelope with a generic message (`Internal Server Error`): exception
messages and backtraces never reach the client. The full error is always in the log.

## Domain

- **`Project`** (`projects`): `slug` (unique, lowercase-hyphenated, read-only once created),
  localised `name` (≤ 120) and `description` (≤ 1000), `status` (`done`, `live`, `in-progress`,
  `planned`, the site's words), ordered `technologies` ids (`Project::TECHNOLOGIES`, the shell's
  badge ids; may be empty), `position` (display order, ties broken by slug) and `published`
  (default **false**). Scopes: `published`, `ordered`.
- **`ProjectLink`** (`project_links`): localised `label` (≤ 60), `url`, `position`; deleted with
  its project; a URL appears once per project.
- **Localised text** is JSONB `{ "en": "…", "pt-BR": "…" }` (ADR-0012), validated by
  `LocalizedTextValidator` and normalised by `LocalizedText` (string keys, trimmed text).
- **Every rule is enforced twice**: by the model and by a database check constraint, unique
  index or foreign key, so bad rows are rejected even when the models are bypassed. One
  difference, by design: link URLs. The model parses the URL (https scheme, a valid host, no
  credentials); the database only checks its shape (starts with `https://`, a non-empty host
  part without `user@`, no whitespace, ≤ 2048 characters). Both reject `http:`, `javascript:`
  and credential-bearing links; only the model rejects e.g. an invalid host name.

### Seeds

`db/seeds.rb` holds the site's projects, copied from the shell's
`apps/shell/src/content/projects.ts` (update both together until Phase 3 switches the shell to
the API). It is idempotent and transactional: projects are matched by slug, their links are
replaced by the seeded list, and a failure rolls everything back. Projects not in the file are
left alone. The test database is never seeded (`seeds: false` in `config/database.yml`).

```bash
bin/rails db:migrate db:seed     # after pulling new migrations or seed changes
```

## Tests

- RSpec with FactoryBot (`spec/factories`, `create`/`build` without prefix). Every example runs
  in a transaction that is rolled back, so examples never share data.
- `spec/requests/`: request specs (`GET /up`). `spec/setup/`: guards for the environment (Ruby
  version, Rails 8.1, API-only, no CORS middleware, FactoryBot) and the database (PostgreSQL 18,
  the test database, transactional isolation).
- `spec/models/` and `spec/validators/`: validations, normalisation, scopes and associations.
  `spec/db/constraints_spec.rb` writes bad rows past the models (`insert_all!`,
  `update_columns`) and expects the database to reject them; each write runs in a savepoint so
  a PostgreSQL error doesn't abort the example's transaction. `spec/db/seeds_spec.rb`: seeds
  create valid records, are idempotent and roll back completely on failure.
- `spec/requests/api/`: the endpoints and error responses. Every response is validated against
  `docs/openapi.yaml` with `assert_schema_conform(status)` (`spec/support/committee.rb`);
  drift specs prove an undocumented or missing field fails. `spec/docs/openapi_spec.rb` keeps
  the document's enums and paths equal to the model constants and routes. Production error
  handling is tested by switching the request to production-style exception rendering.
- The suite needs PostgreSQL running and nothing else (no Node, no shell).

## Continuous integration

GitHub Actions' `api` job (`.github/workflows/ci.yml`, ADR-0010) runs **`bin/ci`**, the same
command as locally, with Ruby from `.ruby-version`, cached gems and a `postgres:18.6-trixie`
service container. There is no `.env` in CI: the connection comes from `DATABASE_*` variables
(a throwaway password for the job's own container; no repository secrets). To add a check, add a
step to `config/ci.rb`; it then runs both locally and in CI. Keep the PostgreSQL image tag
identical in `infra/compose.yaml` and the workflow, and bump the pinned `ruby/setup-ruby` SHA
when `.ruby-version` changes.

## Troubleshooting

| Symptom                                                      | Fix                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Your Ruby version is 3.x, but your Gemfile specified 4.0.9` | asdf isn't reading `.ruby-version`: `asdf current ruby` shows the source. Make sure `~/.asdfrc` has `legacy_version_file = yes` exactly once (duplicate lines disable it). Workaround: `export ASDF_RUBY_VERSION=4.0.9`. |
| `asdf install ruby 4.0.9`: unknown version                   | `asdf plugin update ruby`                                                                                                                                                                                                |
| `Cannot connect to the Docker daemon`                        | Start Docker. On WSL without systemd: `sudo service docker start` (once per WSL boot).                                                                                                                                   |
| `required variable POSTGRES_PASSWORD is missing a value`     | Create `infra/.env` (Setup, step 2).                                                                                                                                                                                     |
| `Connection refused` on port 5432                            | PostgreSQL isn't running: `docker compose -f infra/compose.yaml up -d --wait`.                                                                                                                                           |
| Port 5432 already in use                                     | Set the same free port as `POSTGRES_PORT` in `infra/.env` and `DATABASE_PORT` in `services/api/.env`, then `up -d --wait` again.                                                                                         |
| `password authentication failed`                             | The two `.env` files differ, or the password changed after the volume was created (the volume keeps the first one). Restore the original password, or change it inside the database with `ALTER ROLE`.                   |
| `/up` returns 200 but specs fail to connect                  | `/up` only checks that the app boots, not the database. Check PostgreSQL and the `.env` files.                                                                                                                           |
