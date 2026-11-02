# Mascot 3D: M4 report

**Date:** 2026-11-01. **Branch:** `poc/mascot-3d`, on top of `b39e154`. **Status:** the owner approved M4's behaviour and performance
on Windows Chrome, on real GPU hardware. The custom character and M5 have not started.

## Results

| Check                                                              | Result                             |
| ------------------------------------------------------------------ | ---------------------------------- |
| Flagged browser suite under the real headers (`test:e2e:mascot3d`) | **210 passed**                     |
| Flag off, full-stack browser suite (`test:e2e`)                    | **288 passed**, 132 skipped        |
| Flag off, static browser suite (`test:e2e:static`)                 | **279 passed**, 141 skipped        |
| Firefox smoke test (`test:e2e:mascot3d:browsers`)                  | **6 of 6 passed**, with 3D running |
| WebKit smoke test (see "Browsers" for how it ran)                  | **6 of 6 passed**, with 3D running |
| Unit tests (`npm test`)                                            | **912 passed**                     |
| Prettier, lint, typecheck, `content:check`                         | Pass                               |
| Robot through `mascot:check-model`                                 | Passes, with 2 size warnings       |

The skips are the same desktop-only and mobile-only cases as M3, with the same totals. **On this machine, the browser command as
written still fails for WebKit,** because the system libraries aren't installed. See "Browsers".

After these runs one test was renamed, because its old name claimed something it didn't check and the measurements
contradict. See "Performance".

## What M4 changed

**The character is separate from the behaviour.** Everything about the model lives in `character/`. Behaviour code knows it only
through `character/contract.ts`, and `boundary.test.ts` rejects a robot clip, node or measurement anywhere else. The separation
changed no behaviour: the 179 earlier flagged tests still pass.

**Replacing it is proven without creating it.** A test character made of boxes, with different names for everything, completes
the whole sequence with no behaviour change. `docs/assets/MASCOT-3D-SPEC.md` is the brief for whoever builds the model, and
`npm run mascot:check-model` checks a GLB without a browser.

**Your three refinements:**

1. **The laptop is optional.** Accessories are separate named nodes, listed in the profile. A test shows that one changes no
   motion, and that a model without its node still works. The spec requires both arms to stay free.
2. **300 KB is a target.** Going over it, or the triangle and bone targets, is a warning and not a failure. The spec says that
   raising one needs measurements and your approval, and has a place to record it.
3. **The watchdog is conservative.** It judges 90-frame windows by their median, needs a median of 80 ms or more in **2 windows
   in a row** (about 14 s of animated time), and any good window clears the count. It ignores the first 12 frames after loading or
   any pause, and gaps of 1 s or more. Nothing is stored, so a reload tries 3D again.

**One failure path.** An error in a frame, a lost context, a failed load, a model that fails validation and sustained slowness all
dispose the engine and restore the 2D mascot in the right place, with no retry during that page load.
`data-mascot3d-fallback` on `<html>` records the reason.

**Other changes:**

- Full disposal of the engine's resources.
- Shaders compiled during load.
- A low-end check: 2 GB of memory or less, or 2 cores or less, where the browser reports them.
- A print rule that hides the canvas.
- A shorter stay on the card.

## Acceptance criteria

| #   | Criterion                                                    | Status                                                                                       |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | No robot details outside its folder, enforced                | **Met**                                                                                      |
| 2   | The test character completes the sequence                    | **Met**                                                                                      |
| 3   | A broken model falls back to 2D                              | **Met**                                                                                      |
| 4   | Every failure restores the 2D mascot                         | **Met**, including mid-air and forced slowness                                               |
| 5   | The chaos test passes across several seeds                   | **Met**, on 4 seeds of 30 random actions each                                                |
| 6   | Renderer stays flat over 200 trips, and across width changes | **Met** for the renderer's geometries, textures and programs. JS heap was not measured       |
| 7   | Automatic motion under 5 s; Forced Colors, zoom, print       | **Met**, with zoom and Forced Colors emulated. The 5 s comes from a unit test of the timings |
| 8   | Firefox and WebKit results reported                          | **Met.** Both passed 6 of 6, with WebKit run through a temporary setup                       |
| 9   | The flagged suite runs on CI                                 | **Not yet shown.** The job is written and its YAML parses, but it needs a push to run        |
| 10  | Flag off: nothing 3D, suites pass                            | **Met**                                                                                      |

## Browsers

| Browser                          | Status                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Chromium, here                   | Full suite, **software rendering**                                                              |
| Playwright Firefox, here         | Smoke test only, with 3D running on **software rendering**                                      |
| Playwright WebKit, here          | Smoke test only, with 3D running on **software rendering**, through a temporary setup           |
| Real Chrome on Windows           | **Reviewed and approved by the owner,** on a GTX 1650                                           |
| Real Edge and Firefox on Windows | **Not reviewed:** the checklist below                                                           |
| Real Safari, iPad, iPhone        | **Not tested, and can't be from here.** An open risk, and Playwright's WebKit wouldn't close it |

**How WebKit ran.** Installing its system libraries needs a `sudo` password, which wasn't available to me, so they are still not
installed. Instead, for one run, I unpacked them into a temporary folder, used a temporary copy of the browser whose launcher could
find them, and skipped Playwright's host check, which still wanted a video plugin (`gstreamer1.0-libav`) that these tests don't use.
Nothing on the system or in the repository changed. **That setup is not repeatable from the repository.** To run WebKit normally:
`sudo npx playwright install-deps webkit`, then `npm run test:e2e:mascot3d:browsers`.

## Performance

### Real GPU, measured by the owner

Windows Chrome, NVIDIA GeForce GTX 1650, Direct3D 11:

| Item               | Measured                 |
| ------------------ | ------------------------ |
| Frames             | 2,345                    |
| JS per frame       | p50 0.70 ms, p95 1.50 ms |
| Slowest frame      | 32.60 ms, **frame 1**    |
| GPU time, mean     | 8.91 ms                  |
| `mascot3dFallback` | `undefined`              |

- **The watchdog stayed quiet,** on its first real frames. That is one session on capable hardware. It still hasn't run on a slow
  real device.
- **GPU time is well above M1's** 0.38–1.63 ms on the same GPU. M1 was an earlier, separate version, and I haven't investigated the
  difference. 8.91 ms fits a 60 Hz frame (16.7 ms), but it leaves less room than M1 suggested, so **a weaker integrated GPU is still
  an unmeasured risk.** Check this before the production decision.
- **Frame 1 is the slowest here too,** as in software rendering, and it remains unexplained.

### Software rendering

**This section is SwiftShader, so it says little about a real GPU.**

| Item                                  | Measured                                                       |
| ------------------------------------- | -------------------------------------------------------------- |
| JS per frame, whole sequence (3 runs) | p50 1.3–1.4 ms, p95 2.3–3.0 ms                                 |
| Slowest frame (3 runs)                | 83–111 ms, always **frame 1**, while the 2D mascot still shows |
| Renderer resources over 200 trips     | No change                                                      |
| Engine download                       | About 161 KB gzipped, against a 200 KB budget                  |
| Model                                 | 453 KB and 43 bones, against targets of 300 KB and 30          |

**The peaks.** M3 left peaks of 66–144 ms unexplained. They now fall on frame 1, before the 3D character is visible. M3 didn't record
which frame was slowest, so **I can't say that compiling shaders during load is what improved this**, and I didn't determine what
makes frame 1 slow. A test was named "the first frames are not the slowest", which is false and which it never checked. It's now
"frame costs are recorded through the whole sequence, for the report".

**Page impact,** on `/about`, 9 alternating fresh loads each, measured over 4 s, using `vite preview` locally:

|                      | Flag off         | Flag on, 3D active |
| -------------------- | ---------------- | ------------------ |
| LCP, median (range)  | 172 ms (120–176) | 132 ms (124–192)   |
| Long tasks, median   | 0                | 2                  |
| Their total, median  | 0 ms             | 246 ms             |
| Longest, median      | 0 ms             | 149 ms             |
| Layout shift, median | 0.0078           | 0.0078             |

- **LCP:** no sign of a delay. The difference is within the noise, and the lower number with the flag on shouldn't be read as an
  improvement.
- **Long tasks:** the real cost. Loading the engine and starting 3D blocks the main thread for about a quarter of a second here. A
  test confirms the engine starts downloading only after the first paint. These tasks haven't been measured on a real GPU.

## Limits of the testing

- **The back/forward cache is simulated,** because automated Chromium disables it. Try it by hand (checklist).
- **Hidden tabs are simulated** by overriding `document.hidden`.
- **Zoom is emulated** with a smaller viewport at double density, not with the browser's zoom control.
- **The watchdog has never run on a slow real device.** Its logic is unit-tested, and an E2E test feeds it made-up frames. Test
  builds don't feed it real ones, because software rendering would trigger it. The owner's Chrome session is the only time it has
  seen real frames.
- **The CI job has never run on GitHub,** and its timings there are unknown. It starts as advisory (`continue-on-error`).
- **`vite preview` doesn't send the site's CSP.** The Windows preview below won't show a CSP problem. The flagged suite covers
  that under the Pages emulator with the real headers.

## Problems on the published site, unrelated to 3D

Found while testing, and confirmed on a build with the flag off. **Not fixed**, since they're outside M4:

1. **The 2D nav mascot is about 17 px off-centre on first load,** until a resize or a navigation.
2. **Rapid navigation throws uncaught `Transition was skipped` errors,** from view transitions.
3. **Forced Colors mode has one contrast finding,** on the EN button.

## Try it on Windows

Stop any earlier preview first, including the one on port 4175, with Ctrl+C in its terminal. In WSL:

```bash
cd ~/claude/developer-portfolio
nvm use
VITE_MASCOT_3D=1 npm run build -w apps/shell -- --outDir .mascot3d-dist --emptyOutDir
npm run preview -w apps/shell -- --outDir .mascot3d-dist --port 4175 --strictPort
```

**Don't skip the build.** `.mascot3d-dist` currently holds the test build, which contains the test characters and keeps the
watchdog off real frames. The command above makes a normal flagged build.

Open `http://localhost:4175/` and hard-refresh with Ctrl+Shift+R.

### Real-GPU numbers

Open any page, wait for the jump, click another link, and when the character has sat down run this in the console:

```js
__mascot3d.report();
```

It returns one line: the renderer, device pixel ratio, frame count, JS p50, p95 and maximum, which frame was slowest, and GPU time
where the browser offers it. Please send me the line from each browser. **The renderer's name shows whether it really used your
GPU.**

### Checklist, in Chrome, Edge and Firefox

1. **The sequence:** seated, 5 s, jump, card, point, return on the next click. Is it smooth?
2. **No wrong fallback:** after a few minutes of normal use, `document.documentElement.dataset.mascot3dFallback` should be
   `undefined`. If it's `slowdown` on your hardware, the watchdog is too strict, which is the failure you asked me to avoid.
3. **Failure path:** run `__mascot3d.breakNextFrame()`. The 2D mascot should take over in the right place, and a reload should
   bring 3D back.
4. **Tab restore:** switch to another tab for a minute during a jump, then come back. There should be no sudden move and no
   fallback.
5. **Back/forward cache:** go to an external site from the same tab, then press Back. The character should be in the right place.
6. **Zoom:** use Ctrl and + up to 200%, on the card.
7. **Printing:** the print preview should show the 2D mascot and no canvas.
8. **Forced Colors:** turn on a Windows contrast theme, then Tab to a nav link. The ring should be clear.
9. **Reduced motion:** turn it on in Windows settings. He should never jump.
10. **Themes and languages:** all five pages, EN and PT, light and dark, as in M3.

## Still open

1. **Real Edge, Firefox and Safari** haven't been reviewed.
2. **The GPU time** above, on weaker hardware.
3. **The three site problems above:** I recommend separate steps, since they affect the published site.

## Files

**New:** `character/` (contract, chooser, validator, `robot/`, `fixture/`, README, tests), `watchdog.ts`,
`scripts/build-mascot-fixture.mjs`, `scripts/check-mascot-model.mjs`, `docs/assets/MASCOT-3D-SPEC.md`,
`e2e/tests-mascot3d/resilience.spec.ts`, `e2e/tests-mascot3d-browsers/`, `e2e/playwright.mascot3d-browsers.config.ts`.

**Changed:** `engine.ts`, `rig.ts`, `anchors.ts`, `landing.ts`, `motion.ts`, `capabilities.ts`, `useMascotDirector.ts`,
`mascot3d.css` and their tests, `.github/workflows/ci.yml`, `package.json`, `CLAUDE.md`, `docs/DEVELOPMENT.md`,
`docs/ROADMAP.md`, ADR-0010.

**Moved:** the robot's GLB and its README, from `assets/` to `character/robot/`.

**No shell files outside `mascot/three/` changed,** and `_headers` and `SecurityHeaders` are unchanged.
