# ADR-0010: Continuous integration with GitHub Actions (no deployment yet)

- **Status:** Accepted (Phase 1, Step 12; the `api` job added in Phase 2, Step 2.2; the `e2e` job
  became full stack in Step 3.1, `e2e-static` was added in Step 3.3 and `image` in Step 4.2)
- **Date:** 2026-10-24

## Context

Every check exists locally (format, lint, typecheck, unit tests, build, Playwright E2E with axe),
but nothing enforces them on pushes and pull requests. The repository lives on GitHub. The
owner decided to **postpone deployment** until the Ruby on Rails API and PostgreSQL are
integrated (docs/ROADMAP.md, Phase 4), so Step 12 covers CI only: no hosting, no CD, no
production infrastructure, no secrets.

## Decision

One workflow, `.github/workflows/ci.yml`, on `push` to `main` and on `pull_request`:

- **Five parallel jobs** on `ubuntu-24.04`, each with a timeout:
  - `quality`: `npm ci` → `format:check` → `lint` → `typecheck` → `test` → `content:check` →
    `build`. Fast feedback (≈ 1 minute of work).
  - `e2e`: `npm ci` → Ruby with the API's cached gems → Chromium (+ system libraries) →
    `npm run test:e2e` (since Step 3.1 full stack: a `postgres:18.6-trixie` service and the same
    throwaway database password as `api`; Playwright starts the Rails API in its `e2e`
    environment and the shell's `vite preview`, which proxies `/api` to it) → uploads the HTML
    report as an artifact (14 days), also when tests fail. Timeout 25 minutes.
  - `e2e-static` (Step 3.3, ADR-0014): the same steps without PostgreSQL or Ruby, running
    `npm run test:e2e:static` against the static build; its report is `playwright-report-static`.
  - `image` (Step 4.2, ADR-0015): `docker build` of the production image, then
    `scripts/smoke-image.sh` (with the read-only browser smoke) against a disposable
    `postgres:18.6-trixie` service on a throwaway database; the image is never pushed.
  - `api` (Step 2.2, ADR-0011): `ruby/setup-ruby` reads `services/api/.ruby-version` and caches
    the gems (`bundler-cache`, frozen `Gemfile.lock`); a `postgres:18.6-trixie` service container
    (the same image as `infra/compose.yaml`) with a health check; then one step, **`bin/ci`**,
    the command developers run locally (`config/ci.rb`: setup of the development and test
    databases, RuboCop, bundler-audit, Brakeman, RSpec). New API checks are added to
    `config/ci.rb`, never only to the workflow. The connection comes from `DATABASE_*`
    variables; the database password is a literal **throwaway**, not a secret: it only guards
    the job's own container on the runner, service definitions can't read the job's `env`,
    and secrets aren't available to pull requests from forks. No path filters: the job runs on
    every push and pull request.
- **Same commands as locally**: the workflow only calls root npm scripts and the API's `bin/ci`,
  so CI and a developer machine can't drift apart. Node comes from `.nvmrc`, Ruby from
  `services/api/.ruby-version`.
- **Caching**: npm's download cache via `actions/setup-node` (keyed on `package-lock.json`); the
  Playwright browser in `~/.cache/ms-playwright`, keyed on the `@playwright/test` version. The
  system libraries are installed on every run (`install-deps`), because they live outside the
  cache.
- **Security**: `permissions: contents: read`; `actions/checkout` with
  `persist-credentials: false`; every action pinned to a full commit SHA (release in a
  comment); `pull_request` (not `pull_request_target`), so forks run without secrets; no
  untrusted input in `run:` scripts; no secrets used at all.
- **Concurrency**: a new push to a pull request cancels its previous run; `main` always runs to
  completion.
- **Content gate** (the roadmap's "no placeholders" gate, originally meant for deployment; kept
  strict in CI by the owner's decision, 2026-10-25):
  `npm run content:check` runs the placeholder test with `VITE_CONTENT_STRICT=1`, failing on any
  `todo()` placeholder. Locally, `npm test` and `npm run content:todo` still only report them.
- **Playwright in CI** (`CI` is set by GitHub): two workers, two retries (a retried test shows as
  _flaky_ in the report and annotations instead of being hidden), `forbidOnly`, GitHub annotations
  plus the HTML report.

## Alternatives considered

| Option                                                   | Why not                                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| One sequential job                                       | Slower feedback; a lint error would wait for the E2E browser install.                                |
| A build job whose `dist/` the E2E job reuses             | The E2E web server already builds in ~3 s; artifact passing adds complexity for no real gain.        |
| Playwright Docker image (`mcr.microsoft.com/playwright`) | Heavier pull on every run and another version to keep in sync with `@playwright/test`.               |
| Firefox and WebKit projects                              | More runtime; Chromium covers the supported behaviour today. Add later if cross-browser bugs appear. |
| Version tags (`@v7`) instead of SHAs                     | Tags can be moved; SHAs are immutable. (Dependabot can keep the SHAs current; see Consequences.)     |
| Deploy/preview environments                              | Out of scope until Phase 4 (owner's decision).                                                       |

## Consequences

- Pull requests show five checks (`quality`, `e2e`, `e2e-static`, `api`, `image`); once the workflow is confirmed green
  on GitHub, all are to be required in the branch protection rules for `main` (a GitHub setting
  the owner configures).
- The `api` job reports through `bin/ci`'s own headings and summary rather than one GitHub step
  per tool (no inline annotations); every step runs even after a failure, and the job fails if
  any did. bundler-audit downloads its advisory database on every run, so a new advisory can
  turn CI red without a code change (intended), and a network outage can fail a run.
- A new `.ruby-version` needs a `ruby/setup-ruby` release that knows it: bump the pinned SHA
  together with it. The PostgreSQL image tag must stay identical in `infra/compose.yaml` and the
  workflow.
- Pinned SHAs don't update themselves. Dependabot (`github-actions` ecosystem) was considered
  and **deferred** by the owner (2026-10-25); until then, update SHA and release comment together
  by hand when bumping an action.
- Phase 3 added full-stack E2E (shell + API + database, Step 3.1) and the static-build E2E job
  (Step 3.3). Deployment (Phase 4) will be a separate workflow.
- Validated before the first push: `actionlint` + `shellcheck` on the workflow, and both jobs
  rehearsed in a clean copy of the repository with `CI=true`.
