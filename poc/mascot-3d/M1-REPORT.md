# Mascot 3D: M1 feasibility report

**Date:** 2026-10-31. **Branch:** `poc/mascot-3d` (uncommitted). **Status:** M1 complete, waiting for
the owner's review. Nothing has been integrated into the shell.

## Verdict

**Feasible, with no hard blocker.** A persistent 3D character can be small, cheap and compliant with
the site's CSP. Three conditions apply:

1. Use plain `three`, not React Three Fiber (R3F).
2. Choose about 64 px: 80 px does not fit standing without a layout change.
3. Commission a custom model: this one has no sit, point, blink or smile.

**Not proven:** frame times on a real GPU, which this environment cannot reach. See "How to measure on
your GPU".

## Viewing the demonstration

The recording is `poc/mascot-3d/out/mascot-3d-m1-demo.mp4`, kept locally and not committed (see `.gitignore`) (1920×1080, H.264, 30 fps, 2:14, 12.5 MB).

- **From Windows:** paste this into Explorer's address bar, then open the file in any video player:
  `\\wsl.localhost\<distro>\<path to the repo>\poc\mascot-3d\out\mascot-3d-m1-demo.mp4`
- **Watch at 100% scale, or full screen on a 1080p display.** The small characters are shown at their
  real pixel size, and scaling changes how legible they look.

| Time | Section                          | What to judge                                                                                            |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 0:00 | Title                            |                                                                                                          |
| 0:06 | Sizes, feet on the link box      | 48, 64 and 80 px on the real nav. Anything cut off at the panel's top edge would be cut off in a browser |
| 0:13 | Sizes, feet just above the label | The same with the feet 9 px lower                                                                        |
| 0:21 | All 24 motions                   | Each is labelled with its source, at 600 px and at real size                                             |
| 1:23 | Whole concept, light, 64 px      | Seat, walk, sit, jump, land, point, react, jump back, run, sit                                           |
| 1:38 | Whole concept, dark, 64 px       | The same                                                                                                 |
| 1:58 | Landing on Home                  | The tightest gap, with the 2D Home mascot left in place                                                  |
| 2:04 | What is missing                  |                                                                                                          |

The video is a **mock on static screenshots**. Page changes are picture swaps rather than route
changes, and the 10 s wait is shortened to 2 s. It shows motion, scale and fit. It does not show
integration, route continuity or view transitions, which belong to M2.

I checked the file by decoding all 4,032 frames with no errors and inspecting frames extracted from
the MP4. I could not watch it in a player here, so real-time playback is for you to confirm.

## Animation provenance

**A. Provided by the model** (clips and morph targets, unchanged apart from retiming where noted):

| Motion                | Length                 | Assessment                                                                                                 |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Idle                  | 3.33 s                 | Usable. Moves only the head and arms (7 channels)                                                          |
| Walking               | 0.96 s                 | Usable, in place                                                                                           |
| Running               | 0.96 s                 | Usable, in place. Needed for long distances (see "Limitations")                                            |
| Jump                  | 0.71 s                 | Good: it includes its own crouch, flight and landing dip. Flight lasts only 0.32 s, so the film retimes it |
| WalkJump              | 0.83 s                 | Available, unused                                                                                          |
| Sitting, Standing     | 0.42 s each            | **Not usable for the concept.** Only an 11% dip, with no seated pose                                       |
| Wave, ThumbsUp        | 1.83 s, 1.58 s         | Possible reactions                                                                                         |
| Yes, No               | 1.67 s each            | Head motion: good subtle reactions                                                                         |
| Punch, Dance, Death   | 0.83 s, 3.33 s, 0.96 s | Not useful here                                                                                            |
| Surprised, Sad, Angry | morphs                 | Available. Surprised suits a landing                                                                       |

**B. Created by bone posing or blending:**

| Motion                           | How                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Seated hold                      | Pelvis dropped, thighs and shins toward the viewer, hands forward, feet placed in code. The rig's feet are not children of the legs |
| Sit down, stand up               | The seat pose blended with Idle                                                                                                     |
| Point, either arm, any direction | Arm, wrist and fingers aimed from bones, blended over Idle                                                                          |
| Look around                      | Head bone added over Idle                                                                                                           |

**C. Created in code on top of clips:**

| Motion                            | How                                                                   |
| --------------------------------- | --------------------------------------------------------------------- |
| Walking or running across the nav | Clip in place, position moved in code at a speed matched to the steps |
| Turning                           | Body rotation, crossfaded Idle → Walking → Idle                       |
| Jump arc                          | A parabola applied to the character, with the Jump clip retimed       |
| Landing squash                    | Stretch applied to the whole character                                |

**D. Unavailable:**

- **Blink:** the only morph targets are Angry, Surprised and Sad, and the eyes have no lids.
- **Smile or any mouth:** the model has no mouth.
- **A true sit clip, sit-to-stand, or a landing separate from the jump.**
- **A pointing clip,** and legible fingers at these sizes (see "Character size").
- **His identity:** face, hair, suit, tie and proportions.

## Renderer comparison

The same scene was built with each candidate in a production build, using Vite 8, `three` 0.187 and
R3F 9.8.

| Added to the shell                                 | Raw      | Gzip         | Brotli   |
| -------------------------------------------------- | -------- | ------------ | -------- |
| **Plain `three` + GLTFLoader**                     | 616.2 KB | **152.7 KB** | 125.2 KB |
| **R3F + `three` + GLTFLoader** (total minus React) | 949.3 KB | **249.4 KB** | 187.9 KB |
| R3F's extra cost                                   | 333.0 KB | 96.7 KB      | 62.7 KB  |

For scale, the shell's main bundle is 116 KB gzipped, and React alone measured 57.7 KB gzipped here.
Neither figure above includes the mascot's own engine code.

| 5 runs, median, software rendering, local server | Plain `three` | R3F      |
| ------------------------------------------------ | ------------- | -------- |
| Load to first frame                              | 290.7 ms      | 661.6 ms |
| Frame time, mean                                 | 9.26 ms       | 8.25 ms  |
| Frame time, 95th percentile                      | 19.1 ms       | 19.4 ms  |

**Recommendation: plain `three`.** R3F exceeds the 200 KB budget by 49 KB, and it took over twice as
long to show the first frame in this test. Per-frame cost shows no meaningful difference. The size gap
likely comes from R3F importing the whole `three` namespace, which defeats tree-shaking, but I did not
verify the cause. R3F was tested without `drei`.

## Character size and fit

Measured at 800, 1024, 1280 and 1920 px, all 5 pages, both languages (`out/header-geometry.json`).
The seated pose is 0.773 of the standing height.

From 1024 px wide, the link box starts at y = 57 and its text at y = 67:

| Height | Seated height | Feet on the link box (y = 57)             | Feet just above the text (y = 66)            |
| ------ | ------------- | ----------------------------------------- | -------------------------------------------- |
| 48 px  | 37 px         | Seated and standing fit                   | Seated and standing fit                      |
| 64 px  | 49 px         | Seated fits, standing cut by 7 px         | **Seated and standing fit, with 2 px spare** |
| 80 px  | 62 px         | Seated cut by 5 px, standing cut by 23 px | Seated fits, standing cut by 14 px           |

At 800 px wide the positions vary by language: link top is y = 66 in English and y = 56 in Portuguese.

**Can it extend above the nav lane?** Yes. The 48 px lane limits only the 2D sprite, so a 3D canvas can
rise above it without moving any layout. The real limit is the top of the page. An 80 px character
would need the header about 14 px taller, which is a layout change for you to decide.

**Costs of the y = 66 position:**

- The feet enter the link's empty padding, overlapping its box and any keyboard focus ring.
- They never touch the label, and clicks pass through.

**Jump takeoff:** the Jump clip lifts the body up to 0.303 of its height above where it stands. Near
the nav, the head can be cut off for a few frames: up to about 17 px at 64 px, and about 38 px at
80 px. This is visible in the film.

**Legibility** (my visual judgement at 1× pixels, using this model):

- **48 px:** reads as a figure, with eyes visible but little else.
- **64 px:** a clear character and pose.
- **80 px:** the most detail, but it does not fit standing.
- **At all three sizes,** the arm's direction reads clearly, but **the fingers do not separate, even at
  80 px.** The final model will need an oversized hand and a simple silhouette.
- **High-density displays were not assessed.** The film is 1×, and these displays should look sharper.

**Landing on the card:**

- Pages other than Home have 143–179 px of clearance, which is plenty.
- Home has **61 px** from 1024 px wide, down to **52 px** at 800 px in Portuguese.
- Directly below the language pill on Home, 64 px overlaps it by 3 px and 80 px by 19 px. At 48 px it
  clears by 13 px.
- So 64 px works on Home only when the landing spot avoids the pill, and it does not fit at 800 px in
  Portuguese. The landing logic must choose a position or a size per page.

**2D mascots:** the peeking mascot occupies part of the card's top edge on other pages, so the film
lands on the opposite side. Both 2D mascots were left in place, per your decision. The film therefore
shows two characters on screen at once, which is the input for the later Home comparison.

## Performance

**All figures use SwiftShader, a CPU software renderer. They are not GPU results** and only allow
comparisons within this table.

| Canvas          | Pixels    | Mean     | 95th percentile | Max     |
| --------------- | --------- | -------- | --------------- | ------- |
| 200×200 at 1×   | 40,000    | 6.13 ms  | 11.0 ms         | 23.4 ms |
| 200×200 at 2×   | 160,000   | 8.22 ms  | 17.4 ms         | 29.2 ms |
| 1920×1080 at 1× | 2,073,600 | 30.74 ms | 42.0 ms         | 51.8 ms |

- **A small moving canvas is clearly the right design.** Even at 2×, it costs about a quarter of a
  full-page canvas, which would miss 60 fps in this test.
- **Measurement note:** my first run reported about 1 ms for every size, which was impossible.
  `gl.finish()` returned early, so I discarded those figures and forced synchronisation with a pixel
  read-back. Timing results now scale with pixel count.

### How to measure on your GPU

The result is displayed on the page, including the name of the GPU actually used:

```bash
cd poc/mascot-3d
nvm use 22
npx vite --port 5199 --strictPort
```

Then open `http://localhost:5199/bench.html` in your Windows browser and leave the tab visible until
the heading says "done".

## Budgets

| Budget (from the plan)                        | Result                                                       |                                      |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Lazy chunk ≤ 200 KB gzipped                   | 152.7 KB for `three` and loader; engine code not yet counted | Met so far                           |
| Model ≤ 300 KB                                | 464 KB (133 KB gzipped)                                      | **Missed** on raw size               |
| ≤ 10k triangles                               | 3,237                                                        | Met                                  |
| ≤ 30 bones                                    | 43                                                           | **Missed**, for this temporary model |
| ≤ 4 ms render, ≤ 2 ms JS on an integrated GPU | Not measured                                                 | **Unknown**                          |
| Flag-off and initial-bundle budgets, CLS, LCP | Not applicable: nothing is integrated                        | Deferred to M2                       |

## CSP

Tested under the Pages emulator with an exact copy of `deploy/cloudflare-pages/_headers`. The test also
confirmed the policy was actually served.

| Probe                                                     | Result                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| RobotExpressive (no images)                               | Loaded, 0 violations                                                                                |
| **Negative control:** GLB with an embedded PNG            | **Blocked** (`connect-src`, `blob:`). The texture never decodes, while the model itself still loads |
| glTF with a same-origin external PNG                      | Loaded with its texture, 0 violations                                                               |
| `blob:` worker, how Draco and KTX2 decoders usually start | Blocked (`worker-src`)                                                                              |
| WebAssembly compile, needed by WASM decoders              | Blocked (`script-src`)                                                                              |
| Plain, R3F, bench and film pages                          | 0 violations                                                                                        |

**Consequence for the final model:** textures must be separate same-origin files or vertex colours, and
mesh compression that needs WASM or `blob:` workers cannot be used. No CSP change is needed.

## Limitations

- **Temporary model:** it says nothing about how the real character will look at these sizes.
- **Walk speed versus the existing timing:** a walk without foot sliding covers about one body height
  per second. Crossing 288 px at 64 px would take over 4 s, far above the 2D mascot's 1.2 s limit. The
  film uses Running for that distance. The final design needs a distance rule and possibly a faster
  run cycle.
- **Fallback detection:** `failIfMajorPerformanceCaveat` did not reject SwiftShader in this headless
  setup. Detection should not rely on it alone. Checking the renderer name is a likely addition, to be
  validated on real browsers.
- **Not tested in M1:** route continuity, view transitions, resize, interruptions, context loss,
  reduced motion and keyboard behaviour. All of these need the shell, which is M2.
- **Language coverage:** the film and legibility views show English only. The measurements cover both
  languages.
- **Licence:** CC0 1.0 per the source README (Tomás Laulhé, with modifications by Don McCurdy), saved at
  `public/models/RobotExpressive.README.md`. Downloaded from the three.js repository at tag `r180`, while
  the library is 0.187.

## Your review points

- **Idle reactions:** `Yes` and the bone-built look-around are the subtle candidates. `Wave` is large at
  this scale. If reactions are added, I recommend they stay rare and short.
- **Pause control:** not needed for the prototype, since the idle stops by itself. Reconsider it before
  any production release, especially if reactions repeat over time. Reduced motion stays mandatory
  either way.
- **Home mascot:** still open, to be compared at a later checkpoint.

## Decisions needed for M2

1. **Renderer:** plain `three` (recommended).
2. **Size:** 64 px with feet at y = 66 (recommended), accepting the overlap with the link's padding and
   focus ring. Alternatively, 80 px with a header about 14 px taller, which is a layout change.
3. **Whether to continue to M2** with this temporary model.

## Files

- `out/mascot-3d-m1-demo.mp4`: the demonstration.
- `out/stills/`: frames extracted from the MP4.
- `out/sizes.json`, `out/verify.json`, `out/header-geometry.json`: raw measurements.
- `src/`, `scripts/`: the spike and its tooling.
- `public/plates/`: screenshots of the current site, used only by the film.

## Addendum: the owner's real-GPU bench

Measured on the owner's NVIDIA GeForce GTX 1650 (Direct3D 11), DPR 1.1, Windows browser:

| Canvas          | Mean     | GPU mean |
| --------------- | -------- | -------- |
| 200×200 at 1×   | 4.05 ms  | 0.38 ms  |
| 200×200 at 2×   | 16.28 ms | 0.43 ms  |
| 1920×1080 at 1× | 7.87 ms  | 1.63 ms  |

- **GPU time** is well inside the 4 ms budget. This is a discrete GPU, so integrated GPUs stay unmeasured.
- **The "Mean" column should not be read as render cost.** 16.28 ms at 2× is 38 times its GPU time and above
  the full-page canvas. It is close to a 60 Hz frame, so the bench's pixel read-back may wait on display
  timing. This is a hypothesis I did not verify.
- **JS cost** was not separated in this bench. M2's engine reports it without any read-back
  (see `M2-REPORT.md`).
