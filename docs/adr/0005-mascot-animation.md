# ADR-0005: Mascot as a CSS-driven state machine with an asset seam

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

The portfolio's mascot, a chibi version of the owner (`docs/assets/mascot-reference.png`), must
walk to the selected menu item, point at the Fun Fact, never block content, respect
`prefers-reduced-motion` and adapt to small screens. The final character art is not ready, so the
behaviour must be built now with placeholder art that can be swapped later without refactoring.
The brief prefers lightweight React/CSS animation over a game engine.

## Decision

- **Pure state machine** (`apps/shell/src/mascot/machine.ts`): poses `idle | walking | pointing`
  and events `PLACE`, `NAVIGATE`, `ARRIVED`, `REST`. Every `NAVIGATE` gets a new move id; `ARRIVED`
  and `REST` for an older move are ignored.
- **CSS does the motion:** the walker's `transform: translateX()` transitions over a duration
  that grows with distance (300–1200ms). A re-targeted walk continues from the current position.
  `transitionend` ends a walk only if it is the walker's own `transform` transition and the walker
  is at the current target; a fallback timer covers a missing `transitionend`. Timers are cleared
  on every new move and on unmount.
- **Triggered by the active section**, not the URL, so moving between sub-paths of one section
  does not walk.
- **Two independent instances** (as in the reference), sharing only the artwork:
  1. **Navigation mascot** (`HeaderMascot`, from 48rem up): lives in a 3rem lane at the top of
     the header (it scrolls with the header and never overlaps text), walks to the active item,
     then faces the Fun Fact card and points down at it.
  2. **Fun Fact mascot** (`FunFactStage` + `FunFactMascot`, all widths): stationary, no timers.
     - **Home (`hero`, from `docs/assets/homepage.png`):** built from the approved raster
       illustrations (`docs/assets/ART-BRIEF.md`, WebP derivatives). The shell renders ONE
       full-bleed backdrop (A1 desktop / A2 mobile, `object-fit: cover`) behind both the Fun
       Fact and the page's hero, with a cream scrim tracking the text column; its height
       follows the real hero and the stage, whichever is lower (`useHeroExtent`). The hero text is top-aligned (not centred against the stage), and "What I do" follows the buttons in the left-hand flow: the hero and that section share one grid (hero / heading / cards, the section a subgrid), and a spacer as tall as the stage spans the first two rows, so the cards always start below the mascot's feet whatever the hero's height. The stage extends past the container's right edge by `--home-stage-shift` (up to 4rem, always leaving 1rem to the viewport edge). From 64rem the stage sits right of the text
       column (`--home-hero-text-ratio`, `--home-stage-height`, shared with HomePage):
       the presenting mascot (A3) → the card on top (the A4 desk props were dropped: the
       backdrop already has enough detail). Below 64rem the card comes first, then the
       mascot, then the text (the card is shell-owned and rendered
       before the page, so it can't follow the page's text without breaking persistence).
     - **Other pages (`peek`, from `docs/assets/funfact.png`):** A5 is drawn twice: the whole
       figure behind the card (z 0), and the same image clipped to the fingertips below its
       ledge line in front of the card (z 2), so the hands grip the card's top edge. The ledge
       (y = 918 of 978) sits exactly on the card's edge, computed from the delivered art. A
       short pop-up replays on section change (none with reduced motion).
       The stage is its own stacking context with the card always on the top layer, so nothing
       covers card text, badges or controls.
       Both are `aria-hidden`, ignore pointer events and contain nothing focusable.
- **Reduced motion:** no walking (it teleports), no bob, walk cycle frozen.
- **Asset seam** (`mascot/assets.ts`): each pose maps to a component drawing it facing right.
  `presenting` and `peeking` use the approved raster illustrations (`mascot/art/
IllustrationArt.tsx`); the navigation mascot's `idle`, `walking` and `pointing` remain
  placeholder SVG until its final frames (A6) exist, and `isPlaceholderArt` keeps the public
  wording honest about that.

## Alternatives considered

| Option                                       | Why not                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Motion (Framer Motion)                       | Nice springs and layout animation, but a runtime dependency for a single horizontal move. Revisit if choreography grows. |
| A game engine / canvas (e.g. PixiJS)         | Heavy, harder to make accessible, overkill for a decorative sprite.                                                      |
| A fixed, full-page overlay                   | Would float over content while scrolling; the header lane cannot cover anything.                                         |
| Web Animations API in JS                     | More code than CSS transitions for the same result, and harder to keep reduced-motion-safe.                              |
| Redrawing the approved art as SVG/CSS shapes | Tried first; not faithful enough to the reference, so the approved raster layers are used instead.                       |

## Consequences

- Swapping in the final art touches only `mascot/assets.ts` (plus the new art files).
- New poses (waving, thinking, celebrating…) extend the `MascotPose` union and the asset map.
- jsdom cannot lay out or animate, so unit tests cover logic with stubbed positions; real
  geometry, overflow and animation are verified with Playwright (Phase 1, Step 11).
- One dev dependency, `sharp`, builds the WebP derivatives (`npm run illustrations`); the
  outputs are committed, so builds and CI don't need it.
- The desktop header is 40px taller (8px + 48px lane instead of 16px top padding); the
  navbar shows the full name ("Bruno Soares Guimarães"), smaller and allowed to wrap between
  48rem and 64rem.
- jsdom can check DOM order and computed `position`/`z-index`, not pixel overlap: Playwright
  (Step 11) must confirm the peeking mascot never covers card text or badges.
