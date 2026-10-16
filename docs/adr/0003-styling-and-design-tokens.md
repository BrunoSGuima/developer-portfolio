# ADR-0003: Styling with CSS Modules and two-layer design tokens

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The shell needs a consistent visual identity derived from the mascot reference
(`docs/assets/mascot-reference.png`). The same look must later apply to a Vue microfrontend
(ADR-0002), and may need dark mode or per-section colour moods. Phase 1 must stay
dependency-light, accessible (WCAG AA) and fast.

## Decision

- **CSS Modules** for component styles, plus a small set of global stylesheets in
  `apps/shell/src/styles/`: `reset.css`, `tokens.css`, `global.css`.
- **Design tokens as CSS custom properties on `:root`**, in two layers:
  1. Raw values (`--color-burgundy-700`, spacing and type scales).
  2. Purpose-named tokens (`--color-text`, `--color-accent`, `--color-surface`, ...).
     Components use only this layer.
- **Palette** sampled from the mascot reference: charcoal `#2a2b30`, burgundy `#802b2a`,
  peach `#fac593`, warm grey `#9d928f`, slate `#738297`, cream `#fcf5ed`, sand `#e9e2dd`.
  Grey and slate are too faint for text, so darker variants (`#5e5a58`, `#4f5d72`) are used
  for muted text (≥ 6:1).
- **Typography:** Inter (variable), self-hosted via `@fontsource-variable/inter`
  (`font-display: swap`; `unicode-range` means browsers download only the Latin file, ~48 kB).
  Font sizes scale smoothly with `clamp()`.
- **Mobile first** with breakpoints 40rem / 48rem / 64rem, documented in `tokens.css`.
- **Motion tokens** collapse to 0 under `prefers-reduced-motion`.
- **Light theme only** for now.

## Alternatives considered

| Option                                 | Why not                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind CSS                           | Fast authoring, but adds build tooling and the Vue app would need its own setup; utility classes would not share as cleanly as plain CSS variables. |
| CSS-in-JS (styled-components, Emotion) | Runtime cost and React-only; cannot be shared with Vue.                                                                                             |
| vanilla-extract                        | Typed tokens, but adds a build plugin for little gain at this size.                                                                                 |
| System font stack                      | Zero bytes and no dependency, but renders differently per OS and is further from the mockup.                                                        |
| Google Fonts `<link>`                  | A third-party request on every visit, with privacy and first-paint costs.                                                                           |

## Consequences

- A Vue app mounted in light DOM inherits all tokens with no extra work.
- Dark mode or per-section themes can be added later by remapping purpose-named tokens only.
- Breakpoint values are repeated in media queries (CSS variables cannot be used there).
- The production build emits all Inter subsets (~220 kB on disk), but each visitor only
  downloads the subsets their text needs (normally just Latin).
