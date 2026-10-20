# ADR-0006: Responsive layout strategy (fluid container, container-sized grids)

- **Status:** Accepted (Phase 1, Step 8)
- **Date:** 2026-10-19

## Context

Every page sat in one 72rem (1152px) container, so wide monitors showed large empty margins
(384px per side at 1920px, 704px at 2560px) while cards stayed narrow. Card grids switched
columns by viewport width, not by the space they actually had, and `auto-fit` let a lone
Projects card stretch across its whole column. The Home hero is a tuned illustrated composition
(the mascot's fingertip points at the Fun Fact card; ADR-0005) that must not drift apart as the
page widens. The visual identity, typography, art and mobile layouts are out of scope.

## Decision

1. **Fluid container:** `--content-max: clamp(72rem, 100vw − 8rem, 96rem)`. It is exactly
   72rem up to a 1280px viewport (so every layout at or below 1280px is unchanged), then grows
   with the screen up to 96rem (1536px, reached at 1664px), leaving at least 4rem per side.
   Header, main and footer share it, so their edges stay aligned.
2. **Reading widths stay bounded:** paragraphs keep `p { max-width: var(--measure) }` (65ch);
   every page intro (`page.lead`, larger text) shares `--measure-lead` (75ch, about 97–105
   characters per line at 20px). Wider containers add columns, not longer lines.
3. **Container-sized card grids:** `page.cardGridFit` is
   `repeat(auto-fill, minmax(min(100%, max(--grid-min, (100% − (cols − 1)·gap) / cols)), 1fr))`
   with per-list custom properties: `--grid-min` (comfortable minimum), `--grid-cols` (column
   cap), `--grid-max` (item maximum width), `--grid-gap`. `auto-fill` keeps empty tracks, so a
   short list keeps normal item widths. The maximum is applied to the items (`max-width`), not
   to the track: a definite track maximum would make `auto-fill` count columns by the maximum
   and drop to fewer, wider-than-needed tracks.
4. **Per-page strategies:**
   - Architecture: "How it's built today" `--grid-min: 20rem`, up to 3 columns (2 at 1280–1440px,
     3 from about 1600px; 1 at 1024px); the timeline up to 3 columns (≥ 18rem); key decisions up
     to 2 columns (≥ 24rem), each at most `--measure` wide.
   - Projects: `--grid-min: 20rem`, up to 2 columns, cards at most 32rem (a single card is
     512px at 1920px, never the full column).
   - About: the experience list is a fit grid
     (`--grid-min: 26rem`, two columns from about 1440px), so the column is used without long
     lines. Contact: no change.
5. **Home composition capped:** the stage width is capped at its 72rem-container size
   (`--home-stage-max: 40.32rem`) and the hero text column likewise (`--home-hero-text-max:
30.68rem`, which the scrim follows). Wider screens keep the mascot, card, fingertip alignment
   and the hero's line breaks exactly as tuned; the extra width becomes space between the text
   and the art, over the full-bleed backdrop.
6. **Home card alignment (whole desktop layout, from 64rem):** the Fun Fact card's left edge
   lines up with the third "What I do" card (`--home-card-width`: one column of the 3-up grid
   plus the stage shift; the right edge is unchanged), and the mascot keeps its horizontal
   offset from the card's left edge, so the fingertip stays at the same spot. The stage is a
   two-row grid (card, then the mascot standing on its bottom edge) with a minimum height
   (`--home-stage-min`): from 80rem it is the fixed stage height, so a short card changes
   nothing; between 64rem and 80rem it is 0, because the aligned card is narrower and taller.
   When the card is taller (narrow widths, Portuguese), the mascot's top margin keeps its
   fingertip `--home-fingertip-gap` below the card's real bottom, and `useHeroExtent` publishes
   the stage's rendered height (`--home-stage-block`) so HomePage's spacer keeps the "What I
   do" cards below the mascot's feet. Measured in Chromium with a 15px scrollbar: 0.0px
   difference at 1024, 1100, 1200, 1279, 1280 and 1440px, no overlaps.
   For visual balance the whole stage (card and mascot together) is then nudged left by
   `--home-stage-nudge` (2.5rem): the card sits 40px left of the third card at every desktop
   width, with sizes, vertical positions and the fingertip unchanged. Set it to 0 for exact
   alignment.
7. **No container queries yet:** grids already size from their own box. Container queries are
   for components that change shape with their width; none do yet.

## Alternatives considered

| Option                                             | Why not                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Stepped `--content-max` at new breakpoints         | Jumps between widths, more tokens, no benefit over one `clamp()`.                               |
| Unlimited container width                          | Line lengths and card rows become unreadable on ultrawide screens.                              |
| Viewport breakpoints per card grid                 | Breaks when the same grid sits in a narrower column (beside the Fun Fact).                      |
| `auto-fit` grids                                   | Collapses empty tracks, stretching a lone card across the row.                                  |
| Track maximum (`minmax(…, 28rem)`) for Projects    | With `auto-fill`, the column count is computed from the maximum: too few columns at mid widths. |
| Letting the Home stage and text grow with the page | The card drifts away from the mascot's fingertip and the tuned spacing below the hero reopens.  |

## Consequences

- Layouts at or below 1280px are pixel-identical to before (verified in Chromium), so mobile and
  tablet need no re-review; only wider screens change.
- New lists choose a strategy by setting a few custom properties instead of new breakpoints.
- jsdom cannot lay out grids: unit tests pin the rules, and the real behaviour is verified in a
  browser (manual matrix now; Playwright in Step 11 at 320 / 768 / 1024 / 1280 / 1440 / 1920 /
  2560px).
- Changing the Home tokens (`--home-stage-height`, the presenter's size and offset,
  `--home-stage-max`, `--home-hero-text-max`) must be done together (ADR-0005).
