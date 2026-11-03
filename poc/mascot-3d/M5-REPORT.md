# Mascot 3D: M5 report, integration and release readiness

**Date:** 2026-11-02, updated 2026-11-03. **Branch:** `poc/mascot-3d`, on top of `6448bf7`. **Status:** technical validation complete and approved by the owner, and the licensing checks confirmed by the owner. Committed and pushed to `poc/mascot-3d` with the owner's approval. Not merged into `main` and not deployed: the merge needs the owner's separate approval.

## Licensing

**Confirmed by the owner on 2026-11-03.** The owner reviewed the licensing information and closed the question; no further licensing investigation is planned.

- **Plan:** the model was generated and downloaded under the owner's paid Tripo plan, which explicitly includes "Private Models · Commercial Use".
- **Privacy:** the owner checked that the model is set to Private on Tripo.
- The Blender scripts stay out of this repository until their licensing is decided.

## What changed

- `character/bruno/`: the approved model and texture, profile, pose and README. `character/index.ts` selects him. The robot stays until the owner approves deleting it.
- `character/contract.ts`: an optional `look`. `look.ts`: unlit material and skinned outline.
- `rig.ts`: `applyClips` stops all actions first, so a held clip pose can't fall back to rest; applies the look.
- `engine.ts`: follows theme changes live. `mascot3d.css`: the dark-theme halo.
- Tests: `rig.test.ts`, `e2e/tests-mascot3d/character.spec.ts`, two jump tests replacing the robot-specific one, and the boundary and model checks extended to him.

Behaviour files (`machine`, `motion`, `arc`, `jumpTimer`, `landing`, `anchors`, `watchdog`, `useMascotDirector`) have no changes. The CSP is unchanged.

## Results

The final code, after the gem update, on 2026-11-02. Browser suites ran from a scratch copy, on port 4183 for the static and full-stack suites. The API checks and the image used the repository itself.

| Check                                                                                  | Result                                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RSpec                                                                                  | **323 of 323**, before and after the gem update                                                                                                                                |
| `bin/ci`: setup, RuboCop, `bundler-audit`, Brakeman, RSpec                             | **Passed.** No vulnerabilities, 0 Brakeman warnings                                                                                                                            |
| Full-stack browser suite (`test:e2e`, real Rails API and PostgreSQL)                   | **292 passed, 144 skipped, 0 failed** (288 before the update, plus the 4 new card checks)                                                                                      |
| Static suite on the published build (Pages emulator, real headers)                     | **289 passed, 147 skipped, 0 failed**, including `production-3d.spec.ts`                                                                                                       |
| Mascot suite on its test build                                                         | **282 of 282 passed**                                                                                                                                                          |
| Production image: build, `smoke-image.sh`, browser smoke with `SMOKE_WRITE=1`          | **All checks passed**, 15 of 15 in the browser, on the throwaway database. 312 MB. No model, engine or source map outside the gems' own folder, and it runs as a non-root user |
| Cloudflare's exact build command on a clean export of the files a commit would include | **Passed:** `{"mode":"static","mascot3d":true}`, 57 files, 2.7 MB, no file over 25 MB, `_headers` and `assets/404.html` present, no top-level `404.html`, no source maps       |
| Unit tests                                                                             | **948 of 948 passed**                                                                                                                                                          |
| Prettier, lint, typecheck, `content:check`, `api:types:check`                          | Passed                                                                                                                                                                         |
| `npm audit --omit=dev`                                                                 | 0 vulnerabilities                                                                                                                                                              |
| `mascot:check-model`                                                                   | Passes: 3,820 triangles, 22 bones, 7 clips, 184 KB                                                                                                                             |
| Static suite without the flag (`E2E_STATIC_SERVER=preview`)                            | 248 passed, 184 skipped, 0 failed. Run before the gem update; no frontend code changed after it                                                                                |
| Firefox and WebKit smoke tests                                                         | 6 of 6 each. Run before the gem update, as above. WebKit needs the temporary browser copy, with Playwright's host check skipped                                                |

Skipped tests are checks for the other build mode or the other viewport.

### GPU, measured by the owner

Chrome on port 4180: NVIDIA GeForce GTX 1650, DPR 1.10, 2,008 frames, JS p50 0.20 ms, p95 0.50 ms, max 29.50 ms (frame 1), **GPU 0.67 ms, against the 8.91 ms target: met.** This timer covers WebGL only, not the compositor or the dark theme's CSS halo. The report doesn't record which theme was active.

### Gem update

`bundler-audit` reported 11 advisories. Only `Gemfile.lock` changed, with `bundle update --conservative`, and only these gems:

| Gem                    | From   | To     | Advisories                                             |
| ---------------------- | ------ | ------ | ------------------------------------------------------ |
| `loofah`               | 2.25.2 | 2.25.3 | 6: XSS, sanitizer bypasses, a regular expression DoS   |
| `nokogiri`             | 1.19.4 | 1.19.7 | 3: use-after-free, mutation XSS, an SSRF on JRuby only |
| `rails-html-sanitizer` | 1.7.1  | 1.7.2  | 2: XSS through shared state, a regular expression DoS  |

**Exposure was low.** All three come in through Rails, the API's own code doesn't call them, and they are in the local backend and image only, never in the published site. The update matters mostly because the `api` CI job fails without it.

### Easy TV App, end to end

- **Rails API:** seeded in the development and e2e databases. `GET /api/v1/projects` returns it third, with status `in-progress`, its three tags, no links and both languages.
- **Same content:** the full-stack suite's comparison of the API and the static data passes, and the seeds are still idempotent.
- **Full-stack and static builds:** the new browser checks find its status, category and tags in both languages, no link or image, and no horizontal overflow, on desktop and mobile.

**A correction.** The previous report and message said 930 of 930 unit tests passed on the fixed Fun Facts. Re-running that copy shows one failure: `boundary.test.ts` rejected a code comment in `funFacts.ts` that named the character's folder. It was comment text, with no effect on behaviour, and it's fixed.

**Held-pose fix, tested by removing it in a copy:** the browser sit test fails and `rig.test.ts` fails from frame 2 for sit and both points. The browser pointing test passes without the fix, so it
doesn't guard this bug. `rig.test.ts` does.

**Jump test.** The old guard required the clip alone to rise above 1.1 heights. It's replaced by two tests on the real flight: he rises at least 2 px with the head on the page (sampled 2 to 5 px above his
standing height, across 4 page and width combinations), and with the nav moved to the very top of the page, where the arc alone would break the margin, the head stays on the page in every frame.

## The 2D flash on load

**Cause: design, not only asset loading.** M4 kept the 2D nav mascot until the first 3D frame as a safety net, and the load only starts when the browser is idle (up to 1.5 s), then fetches
the host chunk, engine, model and texture in turn. M4 also never hid the Fun Fact mascot, and a test required it to stay beside the 3D character.

**Fix.** `gate.css` is added to `index.html` only by flagged builds, so it applies before the first paint: at desktop widths on screen, every 2D mascot is hidden unless `<html data-mascot2d>` is set. The director
and `RootLayout.tsx` set it when 3D can't run or fails, or when a load passes a 10 s budget (it's removed if 3D finishes later). Mascots are hidden with `visibility`, so nothing shifts and his landing spots don't change.

**Owner's decision.** Only the interactive 2D mascots are hidden: the nav mascot and the peeking one (`[data-mascot='header']`, `[data-slot='peek']`, `[data-slot='fingertips']`). Home's presenting illustration is part of the page's design, and shows from its first frame whatever 3D does.

## Larger size, approved by the owner

`SCALE` in `character/bruno/profile.ts` is 1.25; 1 is the size approved in Stage C. His metrics multiply with it, so landing, head room and speeds use his true size, which fixes the 800 px overlap of the first attempt. The rule that every pose must fit above the focus ring
limits him to 57 px on the current header, so he is drawn 119% larger, not 125%. Clips play at their approved speed and his feet don't slide, so he crosses the page about 19% faster (43 and 108 px/s, from 36 and 91).

| Check                                                                                                        | Result                                                                               |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| New startup tests: first load, slow engine, model and texture, navigating during load                        | Passed. On the old code, the three tried (first load on both pages, slow model) fail |
| Failures: engine, host chunk, model and texture aborted; no WebGL; a load that never finishes; a frame error | 2D shows in both places                                                              |
| Below the desktop width                                                                                      | 2D shows, and is unaffected                                                          |
| Flag-off build                                                                                               | Still byte-identical to `HEAD`; static suite 279 passed, 141 skipped                 |

M4's checks on the Fun Fact mascots now require Home's illustration to be visible, and the peeking one to be hidden and keep its space.

## Room above the Fun Fact card

The strip above an inner page's card was sized for the large 2D head, leaving 115 to 158 px between the header and the card. In 3D the room is now 72 px at every width from 768 px (his 57 px, M4's 4 px clearance, and air), set by changing that reservation in `gate.css`, with no negative margins or transforms.
Flag-off builds, phones and Home are unaffected. A real 2D fallback gets its full strip back, so the card moves down when that happens. His landing x is unchanged, because the hidden peeking mascot's area still counts as occupied.

## Fun Facts

One fixed fact per page, chosen only by the page and whether this is the 3D experience (`PageFunFact.tsx`). The owner tried and removed a rotation. In the 3D experience, About shows "Meet My 3D Mascot!" and Architecture shows "Small Character, Real Animations", in place of their own. Home, Projects and Contact keep theirs. Phones, the 2D fallback and flag-off builds keep all the originals.

"The 3D experience" uses the same rule as `gate.css`: a desktop width, unless 3D has failed. So the fact is right from the first paint, not swapped once 3D finishes loading. On a device that can't run 3D, it changes to the original when the check runs, up to 1.5 s after load, as the 2D mascots appear. The card's height changes with it.

**Bundling check.** A lookup table built at load time once kept the fact text in the flag-off bundle, which the comparison caught. The flag-off build test now also rejects the facts' text.

Checked against the implementation (`funFacts.test.ts` pins the numbers to the files):

| Owner's wording                      | Finding                                                                                                                      | Final wording                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| "refined and animated using Blender" | **Not accurate:** Blender did the cleanup and rigging. The clips came from custom scripts and were baked with glTF Transform | "refined and rigged in Blender and animated with custom scripts" |
| "22-bone skeleton"                   | True: 22 joints in the file                                                                                                  | Unchanged                                                        |
| "seven animations"                   | True, counting pointing as two clips, one per arm                                                                            | "seven animation clips", "pointing with either arm"              |
| "about 225 KB"                       | True for model plus texture: 230,464 bytes, 225 KiB. The engine code is separate, about 162 KB compressed                    | "The optimized 3D asset, model and texture together"             |

## Measured in the owner's browser

Two reports, after the jump and the sit, as supplied:

```text
ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar | DPR 1 | 6594 frames | JS p50 0.00 p95 1.00 max 112.00 ms (frame 1) | GPU time not available
ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0), or similar | DPR 1 | 6984 frames | JS p50 0.00 p95 1.00 max 112.00 ms (frame 1) | GPU time not available
```

**GPU timing was unavailable, and these do not establish total frame time.** They cover JavaScript only: not the GPU, the compositor or the halo's CSS filter. The browser's timer appears to work in whole milliseconds, so p50 0.00 means under its resolution, not zero. The slowest frame is always frame 1, the start-up. "or similar" suggests the browser generalises its renderer name, so this may not be the exact GPU.
The browser also warned that `WEBGL_debug_renderer_info` is deprecated. `capabilities.ts` and `report()` use it. If it's ever removed, the software-renderer check there would see an empty name and allow 3D, so it should move to `gl.RENDERER` in time. Not a blocker.

## Performance (software rendering only, same sequence, two runs each)

|                                  | Robot (`HEAD`)           | Character                    |
| -------------------------------- | ------------------------ | ---------------------------- |
| JS per frame, p50 / p95          | 0.60-0.70 / 0.90-1.10 ms | 0.30 / 0.60 ms               |
| First frame                      | 52-53 ms                 | 40-43 ms                     |
| Model                            | 464 KB                   | 188 KB, plus a 42 KB texture |
| Geometries / textures / programs | 19 / 6 / 3               | 2 / 2 / 2                    |
| Engine chunk, gzipped            | 160.8 KB                 | 161.6 KB                     |

**GPU time was not available here.** The owner's GTX 1650 figure is above. The cost of the halo's CSS filter is still unmeasured.

## Publishing (ADR-0018)

- **Switch:** `npm run build:pages` sets `VITE_MASCOT_3D=1`. No Cloudflare setting changes, and every other build stays without it.
- **Guards:** `prepare-pages` refuses the test build, which accepts software renderers and test characters. A published build exposes only `__mascot3d.report()`.
- **Site text:** the Architecture page and README describe the 3D mascot, and the Architecture text depends on the same flag.
- **Docs:** ADR-0018, with notes in ADR-0010 and ADR-0016, the Pages guide, the roadmap, the development guide and `CLAUDE.md`. The README's two Home screenshots now show him.
- **Tests:** the static suite now runs on the published build. Headless, it sees the 2D fallback, so `production-3d.spec.ts` makes the browser report a GPU and checks the real gates under the real headers.

**A real bug found this way.** Running the static suite on the published build showed the Fun Fact card being replaced, not updated, when 3D fell back on About and Architecture, because the mascot fact was a separate component. There is now one component, so the card stays mounted.

**Comparison with `HEAD`.** A build without the flag is no longer byte-identical, because the Easy TV App card and the shared card and badge code are in every build. It still has no engine, model or `three` code.

## Easy TV App

A new card on the Projects page, third in the list, with the owner's text and PT-BR translations. It has no link, image or demo. It's in both data sources, with its three tags added in the four places the conventions require.

- **Display-only wording:** the category and "In Development" are in the shell (`content/projectDisplay.ts`). The API still stores `in-progress` and has no category, so no database migration was needed. A full-stack build shows the same card.
- **Translated tags:** tag labels can now be translated.
- **Layout:** captured at 320, 375, 800, 1280 and 1920 px, in both languages and themes, with no horizontal overflow. By eye: 1280 px in English and light, and 375 px in Portuguese and dark.

## Release readiness

**Assessment: ready for the branch push; the merge into `main` waits for the owner's approval.** Every suite that can run here passes, and the owner approved the results.

### Blockers

None open. The two raised on 2026-11-02 were closed by the owner on 2026-11-03:

1. **Licensing of the `.glb`:** the owner reviewed it and confirmed it under their paid plan ("Private Models · Commercial Use"). See Licensing.
2. **The model's privacy setting:** the owner confirmed it is set to Private on Tripo.

### Warnings

- **A merge to `main` deploys at once.** Pages doesn't wait for CI. Safest order: push the branch, confirm CI, open a pull request, then merge.
- **Real Cloudflare Pages has never served the 3D build.** Previews are off, so the emulator is the closest test before production. After deploying, run the checks in the Pages guide. The way back is a dashboard rollback.
- **CI had not run on these changes before the push.**
  - `e2e-mascot3d` took 14.2 minutes here against a 30-minute limit, and CI's machines are slower.
  - That job is advisory, so it won't stop a merge on failure.
- **`main`'s `api` job fails until the merge,** since it still has the old `rack` and these three gems. It doesn't affect Pages.
- **Untested:** real Safari, real Edge and integrated GPUs. WebKit ran only through a temporary setup.
- **On devices that can't run 3D,** About and Architecture can show the mascot fact for up to 1.5 s, then change to the original, and the card's height changes with it.
- **The input art's rights** are separate from Tripo's output terms. They weren't reviewed here.
- **One chaos test** failed once earlier with a browser error during a resize. It has passed in every later run, including the last 282 of 282.

### Optional improvements

- Add a third-party notices file: the published bundle has no licence notices for `three` (MIT) or React.
- Make `e2e-mascot3d` blocking after a third stable CI run.
- Move the software-renderer check off the deprecated `WEBGL_debug_renderer_info`.
- Delete the robot, with the owner's approval. It isn't in the published build.
- Decide the Blender scripts' licence. They stay outside the repository.
- Measure the halo's cost, and look at the lower end of the GPU range.
- Tidy `.github/workflows/ci.yml`: its header still says "No deployment", and the `poc/**` trigger could go after the merge.

### Reviewed, no change needed

- **Pages settings:** the build command, Node version from `.nvmrc`, output directory and environment variables work unchanged, and were reproduced on a clean export. `VITE_MASCOT_3D_ALLOW_SOFTWARE` must not be set there; `prepare-pages` fails the build if it is.
- **Headers:** `_headers` is unchanged, and the parity spec passes in RSpec.
- **CI:** read-only token, pinned actions, no secrets, all five jobs intact. The new static checks run in the blocking `e2e-static` job.
- **Change set:** 65 paths, about 15 MB of tracked and new files in all. The model and texture are the largest new files. Nothing that's git-ignored or stray would be included.

Local leftovers: PostgreSQL in Docker with the seeded development and e2e databases, and the `portfolio:local` image.

Visual evidence, local: `~/claude/mascot-model/out/stage-d/`.
