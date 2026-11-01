# Mascot 3D: M2 report

**Date:** 2026-10-31. **Branch:** `poc/mascot-3d`, with nothing committed. **Status:** M2 complete,
waiting for the owner's review. M3 has not started: there is no timer, jump, card landing or pointing.

## Refinement: sitting on the label (supersedes older clearance figures below)

After the owner's review he looked like he was floating: he sat at y = 51, and the label's ink starts at
y = 71 (1280 px wide), a measured **20 px gap**.

The owner allowed a minimal change to the focus indicator, so four options were compared on the real nav
(`out/m2/focus-compare/comparison.png`). "Hidden" is measured from pixels, in both themes and languages:

| Option                         | At rest    | When focused                      | Indicator hidden | Ring change                |
| ------------------------------ | ---------- | --------------------------------- | ---------------- | -------------------------- |
| A: previous refinement         | y = 68     | Rises 17 px, 20 px from the label | 0%               | None                       |
| **B: tighter ring (chosen)**   | **y = 68** | **Rises 10 px, sits on the ring** | **0%**           | **`outline-offset: -5px`** |
| C: tighter ring, no rise       | y = 68     | Stays, sits across the ring       | 11.3–11.7%       | Same as B                  |
| D: open-top indicator, no rise | y = 68     | Stays, covers part of the tint    | 7.4–7.9%         | Redesigned                 |

**Result:**

| State                      | Lowest pixel | Next to him            |
| -------------------------- | ------------ | ---------------------- |
| At rest                    | y = 68       | Label ink 2–3 px below |
| Keyboard focus on his link | y = 58       | Ring top at y = 59     |

- **The ring:** same 3 px thickness and colour, moved inside the link's existing padding.
- **Scope:** only nav links, and only while 3D is active. Other header controls, the 2D fallback and
  production keep the usual ring. Tests confirm this.
- **Rest line:** the top of the labels' ink minus 2 px, from font metrics that match the pixels within 1 px.
- **Unchanged:** 48 px, header height, flag and 2D fallback.
- **Remaining overlap:** during the 0.12 s rise, his feet briefly overlap the ring that just appeared. With
  reduced motion the rise is instant.
- **Hover:** his feet overlap the top of the link's hover background, but not its text.

**The owner's screenshot** shows his lowest pixel at about y = 51 at scale 1.1, the position from before this
refinement. On the current build at 1.1 scale, a direct load, a mouse click, keyboard Enter and browser back
all rest at y ≈ 68.5, so it could not be reproduced. To check which build is open, run
`__mascot3d.pixelBox().bottom` in the console (about 68, not 51).

Results: flagged E2E **59 passed**, unit **746 passed**, Prettier, lint and typecheck pass. The flag-off build
check in the flagged suite passes. The flag-off static suite (279 passed) ran before the tighter ring, and the
full-stack suite (288 passed) before the positioning work. Neither was re-run, because only flagged code
changed. `debug.setLines` remains in the flagged build's debug API, used by `scripts/compare-focus.mjs`.

Screenshots: `out/m2/final/final-states.png`, `out/m2/final/owner-view-after-click.png`.

## What M2 does

Behind `VITE_MASCOT_3D=1`, a single 3D character lives in the real shell, on the nav:

- It appears seated above the active link, 48 CSS px tall.
- On a section change it stands, turns, walks or runs along the nav, turns back and sits.
- It stays the same DOM element across routes and view transitions.
- It re-anchors without a trip on resize and language change.
- The idle stops after 4 s, and then nothing renders.

**The character is the temporary CC0 robot, not the mascot.** The 2D nav mascot keeps running hidden so
it can take over instantly. The 2D Home presenter and peeking mascot are untouched.

## Try it in your Windows browser

In a WSL terminal:

```bash
cd ~/claude/developer-portfolio
nvm use
VITE_MASCOT_3D=1 npm run build -w apps/shell -- --outDir .mascot3d-dist --emptyOutDir
npm run preview -w apps/shell -- --outDir .mascot3d-dist --port 4175 --strictPort
```

Open `http://localhost:4175/` at 100% zoom, and stop the server with Ctrl+C when done. This doesn't touch
`apps/shell/dist`. I ran these exact commands here, where they correctly stay on 2D because only software
WebGL is available. **Seeing 3D on your GPU is the one step I could not run.**

If you see the 2D mascot, check the browser console:

```js
document.documentElement.dataset.mascot3d; // "active" when 3D is running
```

What to judge:

1. **Size:** is 48 px legible and pleasant?
2. **Sitting:** the sit and stand motion.
3. **Trips:** click adjacent links, then Home → Contact. Is about 4.5 s too slow?
4. **Rapid clicks and back/forward:** does it stay smooth?
5. **Keyboard:** Tab through the nav. The focus ring should stay clear of him.
6. **Reduced motion:** turn it on in Windows settings. He should move instantly, with no walking.
7. **Resize and language:** he should re-anchor without a trip.

Real-GPU JS cost, after a few trips, from the console:

```js
__mascot3d.timing(); // mean and max JS ms per frame, with no GPU read-back
```

## Test results

| Check                                                                                | Result                      |
| ------------------------------------------------------------------------------------ | --------------------------- |
| Flagged E2E under the Pages emulator with real headers (`npm run test:e2e:mascot3d`) | **39 passed**               |
| Unit tests (`npm test`)                                                              | **736 passed**, 61 files    |
| Flag off: static E2E (`npm run test:e2e:static`)                                     | **279 passed**, 141 skipped |
| Flag off: full-stack E2E (`npm run test:e2e`)                                        | **288 passed**, 132 skipped |
| Prettier, lint, typecheck, `content:check`                                           | Pass                        |

The skips are the suites' existing desktop-only and mobile-only cases. No existing test was changed or
removed. `vite.config.test.ts` gained new tests at its end.

## Your specific checks

| Check                            | Result                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Default size                     | **48 px**, confirmed in the running shell at 800, 1024, 1280 and 1920 px in both languages                                        |
| Focus clearance at rest          | **1.05 px above the ring on every nav link** at 1280 px. Tabbing every link at 800 and 1280 px in both languages finds no overlap |
| Focus clearance during a trip    | No overlap in any sampled frame of a Home → Contact trip at 1280 px                                                               |
| Head clipping                    | None seated, standing or moving. At rest, the head is at y = 13.5                                                                 |
| Head clipping in the future jump | `headSafeFeetY` is in place and tested against the real Jump clip's measured height. The jump itself is M3                        |
| Layout shift from the character  | 0                                                                                                                                 |
| Horizontal overflow              | 0                                                                                                                                 |
| Clicks                           | Reach every nav link                                                                                                              |
| Axe                              | 0 violations in light and dark themes                                                                                             |
| Tab order                        | The character is never focused                                                                                                    |
| CSP                              | 0 violations, with `_headers` and `SecurityHeaders` unchanged                                                                     |
| Rendering at rest                | 0 frames in 2 s once the idle ends                                                                                                |
| Hidden tab                       | Rendering pauses and the trip resumes correctly. The hidden state was simulated                                                   |

### A bug the tests caught and I fixed

Partway through sitting or standing, the bent limbs dipped **3 px into the focus ring**. He now rises
about 4 px at the midpoint of that motion, and the trip test passes.

## Flag and fallback

| Situation                              | Result                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| Flag off                               | No `three`, no engine, no model, no 3D CSS. Main bundle grew by 11 bytes gzipped |
| Flag off under the emulator            | No overlay, no 3D requests, 2D mascot visible                                    |
| Invalid flag value                     | The build fails                                                                  |
| Flagged build given to `prepare-pages` | **Refused**, so it can't reach Cloudflare through that script                    |
| No WebGL                               | 2D stays, and no engine or model is requested                                    |
| Software renderer, no override         | 2D stays, and no engine or model is requested                                    |
| Failed model load                      | 2D stays                                                                         |
| Lost WebGL context                     | 2D takes over at the correct link, with no retry                                 |
| Below 48rem                            | Nothing 3D is requested. 2D mobile behaviour is unchanged                        |

The first check caught a real problem: my initial flag lived in a separate module, and the flag-off build
**still shipped the engine and model**. The comparison is now inline in `RootLayout.tsx`, and a test
builds the site with the flag off and checks the output.

## Performance

| Item                                    | Measured                           | Environment                                            |
| --------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| GPU time, 200×200 at 1× and 2×          | 0.38 ms and 0.43 ms                | **Real GPU:** your GTX 1650, M1 bench, not this engine |
| GPU time, 1920×1080                     | 1.63 ms                            | **Real GPU:** your GTX 1650, M1 bench                  |
| JS per frame during trips, no read-back | Mean 1.23–1.30 ms, max about 67 ms | **Software** (SwiftShader), this engine                |
| Lazy engine chunk (`three` + engine)    | 158.1 KB gzipped                   | Build output                                           |
| Host chunk and CSS                      | 1.6 KB and 0.3 KB gzipped          | Build output                                           |
| Model                                   | 464 KB, 133 KB gzipped             | Temporary model                                        |

- **Real-GPU frame costs of this engine have not been measured.** `__mascot3d.timing()` above gives them.
- **Integrated GPUs are unmeasured.**
- **The 67 ms maximum is unexplained.** It could be first-frame shader compilation, but I didn't verify that.
- **Over budget, temporary model only:** 464 KB against 300 KB, and 43 bones against 30.
- **The flagged "initial bundle ≤ 2 KB" budget isn't cleanly verified.** Code splitting rearranges chunks
  when the flag is on, so comparing main bundles isn't meaningful.

## Known limitations

- **Mostly running, not walking.** Walking only covers up to 77 px, and adjacent links are 72–103 px apart,
  so most hops run. Your review may want this tuned.
- **Home → Contact takes about 4.5 s.** That is 3.1 s of running plus standing, turning and sitting, by
  calculation rather than timed, and far above the 2D mascot's 1.2 s.
- **He scrolls away with the header,** because the header isn't sticky. This is by design.
- **The 2D mascot is visible until 3D is ready,** then swaps. I didn't measure how long that lasts.
- **The 2D Fun Fact mascots remain,** so two characters appear on screen. The Home decision stays open.
- **Mid-transition clearance is calibrated for this model at 48 px.** The trip check runs at 1280 px only.
- **A resize during the final sit-down** snaps him sideways to the moved link instead of walking there.
- **Chromium only.** Firefox and Safari are untested.
- **Software WebGL here,** so motion smoothness is yours to judge.
- **Not in CI:** the flagged suite runs locally only.
- **The CSP was tested through the emulator.** The preview commands above serve no CSP.

## Side effects to know about

- **Your dev server on port 5174 is broken until restarted.** Installing `three` made its dependency cache
  stale, and it returns `504 Outdated Optimize Dep`, so pages come up blank. I didn't touch it because I
  didn't start it. Restarting it should fix this.
- **`apps/shell/dist` was rebuilt** by the regression suites. I restored the normal static Pages build, so
  any local server using that folder now serves the current flag-off code.
- **`npm install` is not needed on this machine,** but `package.json` and the lockfile changed.

## Differences from the approved plan

- **48 px instead of 64 px,** per your instruction. He now stays above the ring in every pose, so the plan's
  overlap with the link's padding no longer happens. The logic for it remains for larger sizes.
- **`src/config/mascot3d.ts` was removed,** a file I had added in this step, for the flag reason above.
- **`headSafeFeetY` lives in `anchors.ts`** rather than a separate `headSafe.ts`.

## Files

**New:**

- `apps/shell/src/mascot/three/`: `machine.ts`, `motion.ts`, `anchors.ts`, `capabilities.ts`, `rig.ts`,
  `engine.ts`, `useMascotDirector.ts`, `Mascot3DHost.tsx`, `mascot3d.css`, their tests, and
  `assets/RobotExpressive.glb` with its CC0 README
- `e2e/playwright.mascot3d.config.ts`, `e2e/tests-mascot3d/mascot3d.spec.ts`
- `poc/mascot-3d/M2-REPORT.md`, `scripts/capture-m2.mjs`, `out/m2/`

**Modified:**

- `apps/shell/src/app/RootLayout.tsx`: the flagged host
- `apps/shell/vite.config.ts`, `vite.config.test.ts`: flag validation and its tests
- `apps/shell/src/env.d.ts`, `apps/shell/eslint.config.js`
- `apps/shell/package.json`, `package-lock.json`: `three`, `@types/three`
- `scripts/prepare-pages.mjs`: refuses flagged builds
- `package.json`: `test:e2e:mascot3d`
- `e2e/tsconfig.json`, `.gitignore`, `.prettierignore`
- `poc/mascot-3d/M1-REPORT.md`: GPU addendum

`CLAUDE.md`, the roadmap and the Architecture page are unchanged, as planned, until a production decision.

## Screenshots

In `poc/mascot-3d/out/m2/` (2× density, software rendering):

- `sheet-trip-walk.png`, `sheet-trip-run.png`: a whole trip, phase by phase
- `seated-*.png`: light, dark, Portuguese at 800 px, 1920 px
- `focus-ring-active-link.png`: clearance from the focus ring
- `during-view-transition.png`: visible during the crossfade
- `scrolled-60px.png`: moving with the page
- `fallback-2d-no-webgl.png`, `flag-off.png`: the 2D mascot
- `measurements.json`: the raw numbers
- `position/sheet-states.png`, `position/sheet-trips.png`: the refined position, in every state
