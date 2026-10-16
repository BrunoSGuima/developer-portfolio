# CLAUDE.md

Guidance for working in this repository. Keep it current: update it whenever architecture,
conventions or commands change.

## Project

Interactive developer portfolio for Bruno (Software Engineer, Rails background, expanding into
Python, frontend engineering, distributed systems and AI engineering). It looks like one website
but is powered by several independently developed applications. The site is in English.

## Current phase

**Phase 1 — React MVP.** Step 0 (toolchain & docs) is done. The full approved plan and step list
lives in `~/.claude/plans/pasted-content-id-6e96-interactive-wiggly-wind.md`.

Phase 1 uses **static data only**. Do not add Rails, Python, PostgreSQL, Redis or Sidekiq until
their phase.

## Architecture

- **Shell** (`apps/shell`, React + TypeScript + Vite): a single SPA that owns the layout, main
  navigation, router, Fun Fact banner, mascot layer, page transitions and global UI state. It
  stays mounted while sections change. See ADR-0001.
- **Section registry** (`apps/shell/src/sections/registry.ts`): single source of truth for every
  section (`id`, `path`, `label`, `framework`, `backend`, `status`, Fun Fact text, badges, mount
  strategy). Nav, Fun Fact and Architecture page derive from it.
- **Microfrontends** (Phase 3+): non-React sections implement a framework-agnostic contract
  `mount(el, ctx) / unmount()`, are built independently, served same-origin (e.g.
  `/apps/career/entry.js`) and loaded by the shell's `<RemoteSection>` via dynamic `import()`.
  The shell owns browser history; sub-apps use a base path. See ADR-0002.
- **Backends** (Phase 2+): Rails API and FastAPI, each owning its own database and credentials
  on one PostgreSQL instance. Services never modify each other's tables; they talk via APIs.
- **Hosting**: Phase 1 static (Cloudflare Pages recommended). Later a single VPS with Docker
  Compose behind Caddy, path-routed same-origin. No Kubernetes in the MVP.

## Conventions

- TypeScript `strict` mode (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Minimal dependencies. Phase 1 runtime deps: `react`, `react-dom`, `react-router` only.
  Adding a dependency requires a stated reason.
- Styling: plain CSS + CSS Modules, design tokens as CSS custom properties on `:root`.
- Accessibility is a requirement: semantic landmarks, keyboard navigation, visible focus,
  `prefers-reduced-motion` support, AA contrast. The mascot is decorative
  (`aria-hidden`, `pointer-events: none`) and must never block content.
- **Truthfulness:** the Fun Fact and Architecture page must only describe what is actually
  implemented. Planned components are marked `planned`.
- Mascot: preserve the reference character's identity (`docs/assets/mascot-reference.png`).
  Art is isolated behind an asset map so final assets can be dropped in.
- Significant decisions get an ADR in `docs/adr/` (copy `0000-template.md`).
- No secrets in the repo. `.env*` files are git-ignored (except `.env.example`).

## Testing

- React: Vitest + React Testing Library (query by role/label, not implementation details).
- Vue (Phase 3): Vitest + Vue Test Utils.
- Rails (Phase 2): RSpec + FactoryBot (model, request, job specs).
- Python (Phase 4): Pytest + HTTPX.
- End-to-end: Playwright against the production build, with axe accessibility scans.
- Every completed feature ships with meaningful tests. Prefer test-first when practical.

## Commands

Run from the repository root (after `nvm use`):

| Command | Purpose |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start the shell dev server (from Step 1) |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm test` | Unit/component tests in all workspaces |
| `npm run test:e2e` | Playwright end-to-end tests (from Step 9) |

## Workflow

1. Work in small, approved steps. Explain the objective, decisions and tradeoffs first.
2. Implement only the approved step — no work from later steps.
3. Write tests, run them, report results honestly.
4. Update this file, the README and ADRs when relevant.
5. **Never commit automatically** — the user reviews and commits.
6. Suggest the next step.
