# ADR-0001: React + TypeScript SPA as the persistent application shell

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The portfolio must feel like one cohesive website while being powered by several independently
developed applications (React, Vue, and later others). Something has to own the parts of the UI
that persist across sections — navigation, the mascot, the Fun Fact banner, layout, global UI
state and transitions — and that part must stay mounted while the active section changes, without
full-page reloads.

Phase 1 is a React-only frontend foundation with static data, but it must evolve into a
multi-application showcase without a rewrite.

> **Terminology note (2026-10-25):** this ADR originally called Phase 1 the "MVP". Phase 1 is
> the React frontend foundation; the MVP is complete only when the Rails API, PostgreSQL and the
> frontend/backend integration are validated end to end (end of Phase 3, `docs/ROADMAP.md`).
> The decision itself is unchanged.

## Decision

Build a single **Vite + React + TypeScript (strict)** single-page application in `apps/shell`
that acts as the application shell from day one:

- It owns the layout, main navigation, router (`react-router` v7, declarative mode), Fun Fact
  banner, mascot layer, page transitions and global UI state (React context + `useReducer`).
- A **section registry** is the single source of truth for sections and their real technology
  stack; navigation, the Fun Fact and the Architecture page are derived from it.
- Phase 1 sections are ordinary lazily loaded React routes. Non-React sections will be mounted
  through the contract described in ADR-0002.
- Output is a static build deployable to any static host with SPA fallback.

## Alternatives considered

- **Multi-page site with full reloads between apps** — simplest isolation, but loses the
  persistent mascot/Fun Fact and seamless transitions that are core to the experience.
- **Meta-framework (Next.js, Remix/React Router framework mode)** — adds SSR/server concerns and
  conventions we do not need for a static MVP; can be revisited if SEO requires prerendering.
- **single-spa root config instead of a React shell** — see ADR-0002.

## Consequences

- One React app is the integration point; it must stay small and stable.
- SPA SEO is weaker than server rendering; mitigated with per-route titles/meta and possibly
  prerendering static routes in the deployment phase (Phase 4; renumbered 2026-10-24, see
  docs/ROADMAP.md).
- Static hosting is cheap (free tiers available) and needs an SPA fallback rule.
