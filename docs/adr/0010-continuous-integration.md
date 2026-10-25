# ADR-0010: Continuous integration with GitHub Actions (no deployment yet)

- **Status:** Accepted (Phase 1, Step 12)
- **Date:** 2026-10-24

## Context

Every check exists locally (format, lint, typecheck, unit tests, build, Playwright E2E with axe),
but nothing enforces them on pushes and pull requests. The repository lives on GitHub. The
owner decided to **postpone deployment** until the Ruby on Rails API and PostgreSQL are
integrated (docs/ROADMAP.md, Phase 4), so Step 12 covers CI only: no hosting, no CD, no
production infrastructure, no secrets.

## Decision

One workflow, `.github/workflows/ci.yml`, on `push` to `main` and on `pull_request`:

- **Two parallel jobs** on `ubuntu-24.04`, each with a timeout:
  - `quality`: `npm ci` → `format:check` → `lint` → `typecheck` → `test` → `content:check` →
    `build`. Fast feedback (≈ 1 minute of work).
  - `e2e`: `npm ci` → Chromium (+ system libraries) → `npm run test:e2e` (builds the shell and runs
    the Playwright + axe suite against `vite preview`) → uploads the HTML report as an artifact
    (14 days), also when tests fail.
- **Same commands as locally**: the workflow only calls root npm scripts, so CI and a developer
  machine can't drift apart. Node comes from `.nvmrc`.
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

- Pull requests show two checks; once the workflow is confirmed green on GitHub, both are to be
  required in the branch protection rules for
  `main` (a GitHub setting the owner configures).
- Pinned SHAs don't update themselves. Dependabot (`github-actions` ecosystem) was considered
  and **deferred** by the owner (2026-10-25); until then, update SHA and release comment together
  by hand when bumping an action.
- When the Rails API arrives (Phase 2) it gets its own job (RSpec with a PostgreSQL service
  container); Phase 3 adds full-stack E2E. Deployment (Phase 4) will be a separate workflow.
- Validated before the first push: `actionlint` + `shellcheck` on the workflow, and both jobs
  rehearsed in a clean copy of the repository with `CI=true`.
