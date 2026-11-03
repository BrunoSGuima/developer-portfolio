# Mascot 3D: M3 report

**Date:** 2026-10-31. **Branch:** `poc/mascot-3d`, with nothing committed. **Status:** M3 complete, waiting
for the owner's visual review. M4 and M5 have not started.

## Refinement: walk or run comes from the menu

**The bug:** the gait was re-decided every frame from the remaining distance, so a long hop started as a run and
turned into a walk once under 77 px remained. Architecture's wide label made it most visible. Also, a trip could start
by blending out of the previous trip's gait.

**Now:**

- **Next-door items walk,** and anything with at least one item between them runs, for the whole trip.
- **Decided once,** when the trip starts, from positions in the menu. Distance plays no part, so Architecture behaves
  like every other item.
- **A new trip takes its gait at once,** instead of blending out of the last one.
- **Navigating mid-trip** recalculates from the nearest item, and the gait and speed blend over 0.2 s.
- **Returning from the card** counts from the item nearest where he lands.

**Consequence:** walking is slower, so next-door hops take longer than before. Projects → Architecture takes about
2 s of walking, plus standing and sitting, and may be worth judging.

**The jump, 5 s timer, 48 px size, accessibility and fallbacks were not changed.**

## Final results (2026-11-01)

| Check                                                        | Result                      |
| ------------------------------------------------------------ | --------------------------- |
| Complete flagged browser suite (`npm run test:e2e:mascot3d`) | **179 passed**              |
| Unit tests (`npm test`)                                      | **842 passed**              |
| Flag off, full-stack browser suite (`npm run test:e2e`)      | **288 passed**, 132 skipped |
| Flag off, static browser suite (`npm run test:e2e:static`)   | **279 passed**, 141 skipped |
| Prettier, lint, typecheck, `content:check`                   | Pass                        |

**Two test-only fixes on the way to a clean run.** Neither failure reproduced as an app bug:

- **Stand-up interruption:** the target page's code could load after he had left the ground. The test now loads it first
  and clicks in the same tick. The interruption tests then passed 18 of 18.
- **Lost context:** the test measured the 2D mascot once after a fixed 1.5 s, which is too early under load. It now waits
  for him to arrive. The fallback tests then passed 20 of 20.

Generated evidence (screenshots, the M1 recording, site captures) is kept locally and git-ignored, because it is large and
reproducible with `scripts/`. Reports and measurements are committed.

## What M3 does

Behind `VITE_MASCOT_3D=1`, on top of M2:

1. He sits on the active nav link.
2. **5 s after he has fully settled**, he stands, jumps along an arc and lands on the Fun Fact card.
3. He points once at the card's content, lowers his arm, idles briefly, then rendering stops.
4. On navigation he jumps back to the nav, walks or runs to the new link, sits, and the delay starts again.

He jumps once per page visit and stays on the card until the next navigation. The character is still the
temporary robot, and the 2D Fun Fact mascots are unchanged.

## Try it in your Windows browser

Stop any earlier preview with Ctrl+C, then in a WSL terminal:

```bash
cd ~/claude/developer-portfolio
nvm use
VITE_MASCOT_3D=1 npm run build -w apps/shell -- --outDir .mascot3d-dist --emptyOutDir
npm run preview -w apps/shell -- --outDir .mascot3d-dist --port 4175 --strictPort
```

Open `http://localhost:4175/` and hard-refresh with Ctrl+Shift+R.

What to try:

1. **The jump:** open any page and wait 5 s.
2. **The return:** while he is on the card, click another link.
3. **Interruptions:** click a link while he stands up, in mid-air and while pointing. Then click several links
   quickly.
4. **Timer reset:** click a link about 3 s after he sits. He should wait a new 5 s.
5. **Pages and languages:** all five pages, EN and PT, light and dark.
6. **Widths:** resize the window while he is on the card.
7. **Keyboard:** Tab to a nav link and wait. He should hold the jump until focus leaves.
8. **Reduced motion:** turn it on in Windows settings. He should never jump.

Useful in the console: `__mascot3d.state()`, `__mascot3d.landing()` and `__mascot3d.timing()`.

## Test results at first M3 review (see final results above)

| Check                                                                   | Result                      |
| ----------------------------------------------------------------------- | --------------------------- |
| Flag on, browser tests under real headers (`npm run test:e2e:mascot3d`) | **129 passed**              |
| Real-delay tests, repeated 4 times                                      | **12 of 12 passed**         |
| Unit tests (`npm test`)                                                 | **810 passed**              |
| Flag off, full-stack browser suite (`npm run test:e2e`)                 | **288 passed**, 132 skipped |
| Flag off, static browser suite (`npm run test:e2e:static`)              | **279 passed**, 141 skipped |
| Prettier, lint, typecheck, `content:check`                              | Pass                        |

The two flag-off suites ran before the last change, which touched only a flagged debug value and a test. The
flag-off build check, inside the flagged suite, ran after it. Skips are the existing desktop-only and mobile-only
cases.

## What was verified

- **Timing:** never before 5 s, measured from the app's own record of when the delay started, and under 6 s.
- **Reset:** navigating at about 3 s restarts the delay, and no timer runs during a trip.
- **One jump:** still on the card long after landing, with no second jump.
- **Landing, 40 layouts (4 widths, 2 languages, 5 pages):** feet on the card's edge within 3 px, head on the page, no
  overlap with the 2D mascots, header controls, page text or anything beyond the card's sides, measured at full
  point. No horizontal overflow, and the 2D mascots stay visible.
- **Interruptions:** navigating while standing up, before takeoff, in mid-air and while pointing, and twice on the way
  back, plus rapid navigation. Always one canvas, the right destination, and no teleport (under 110 px between frames).
- **Layout:** resize and language switch on the card, not-found page, a short window.
- **Holds:** card's top edge scrolled away, and keyboard focus on a nav link.
- **Reduced motion:** never jumps. Turning it on while he is on the card places him on the nav at once.
- **Other:** axe 0 on the card in both themes, clicks and keyboard unaffected, no layout shift from him, 0 CSP violations,
  rendering stops after the idle, and a lost WebGL context restores the 2D mascot.

## Bugs found and fixed

- **He could never jump on short windows.** "Wait until 50% of the card shows" can't be met when the card is more than
  twice the visible height. It now checks what matters: the card's top edge, where he lands, must be on screen. This
  **differs from the plan's 50%**.
- **A timing test was wrong, not the timer.** It started its stopwatch when Playwright noticed the page was ready. It now
  uses the app's own record, which also allowed a stricter check.

## Known limitations

- **Home at 800 px in Portuguese has no landing spot.** The nav reaches down to where his head would be, so he stays
  seated. It is the only one of the 40 layouts tested. Widening the window makes him jump.
- **His flight passes over nav labels** for a moment, by design.
- **At takeoff from the nav he stays low,** because head safety holds him down while the clip rises. Judge whether this
  looks natural.
- **Pointing is a temporary-model approximation.** The arm direction reads, but the fingers don't.
- **A language switch on the nav doesn't restart the delay,** because the section hasn't changed.
- **Chromium only.** Firefox and Safari are untested.
- **Software rendering here** (SwiftShader), so smoothness is yours to judge. No real-GPU frame costs for M3 yet.
- **Not in CI:** the flagged suite runs locally only.
- **Over budget, temporary model only:** 464 KB against 300 KB, and 43 bones against 30.

## Performance

| Item                                                  | Measured                                                            | Environment           |
| ----------------------------------------------------- | ------------------------------------------------------------------- | --------------------- |
| JS per frame through the whole sequence, no read-back | Mean 1.0–1.2 ms, max 66–144 ms                                      | **Software renderer** |
| Engine download (`three` + engine)                    | 159.9 KB gzipped, within the 200 KB budget                          | Build output          |
| Host chunk                                            | 3.3 KB gzipped                                                      | Build output          |
| Real GPU                                              | Not measured for M3. `__mascot3d.timing()` gives it on your machine |                       |

I did not determine what causes the maximums.

## For your review

1. **Landing spot:** he lands as close to the active link as possible, beside the 2D mascot. Does that look right?
2. **Jump feel:** the arc, takeoff and landing.
3. **Point and idle:** about 2 s of pointing, then still after about 4 s.
4. **5 s delay:** does it feel right once he repeats it on each new page?
5. **Two characters:** the 3D robot next to the 2D mascots. That decision stays open.

## Files

**New in `apps/shell/src/mascot/three/`:** `landing.ts`, `arc.ts`, `jumpTimer.ts`, and their tests.

**Changed in that folder:** `machine.ts`, `motion.ts`, `anchors.ts`, `rig.ts`, `engine.ts`, `useMascotDirector.ts`,
`mascot3d.css`, and their tests.

**Tests and tools:** new `e2e/tests-mascot3d/jump.spec.ts`, and small edits to `mascot3d.spec.ts`. New
`poc/mascot-3d/scripts/capture-m3.mjs`.

**No shell files outside that folder changed in M3,** and `_headers` and `SecurityHeaders` are unchanged.

## Screenshots

In `poc/mascot-3d/out/m3/` (2× density, software rendering), each sheet showing the whole sequence:

- `sheet-about-en-light.png`, `sheet-about-en-dark.png`, `sheet-about-pt-light.png`, `sheet-about-pt-dark.png`
- `sheet-home-en-light.png`, `sheet-home-en-dark.png`, `sheet-about-800.png`
- `measurements.json`: every layout's landing spot and frame costs
