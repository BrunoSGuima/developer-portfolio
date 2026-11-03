# ADR-0018: Publishing the 3D mascot

- **Status:** Proposed (M5; takes effect when the owner merges it to `main`, which deploys it)
- **Date:** 2026-11-02

## Context

The 3D mascot was built on `poc/mascot-3d` behind `VITE_MASCOT_3D=1`, and `prepare-pages` refused any such build. The owner approved the
character, its 57 px size, the fixed Fun Facts, desktop-only 3D and the 2D fallback, and asked to prepare its publication.

Three things constrain how:

- **Only the public site should change.** The full-stack build and production image run locally, and nothing there needs 3D (ADR-0016).
- **Tests need a different build from visitors.** Headless browsers have only a software renderer, which the app refuses. The test build
  (`VITE_MASCOT_3D_ALLOW_SOFTWARE=1`) accepts it, along with test characters, so it must never be published.
- **Pages builds every push to `main`,** without waiting for GitHub Actions, and preview deployments are off. A merge is a deployment.

## Decision

1. **`npm run build:pages` sets `VITE_MASCOT_3D=1`.** The Cloudflare Pages build command and dashboard settings stay as they are, so what's
   published is in the repository, reviewed with the change and reproducible locally. A unit test keeps the flag in that one script.
2. **Every other build stays without it:** `npm run build`, `build:fullstack` and the production image. The comparison stays an inline
   literal, so they contain none of the mascot's code, model or text.
3. **`prepare-pages` refuses the test build,** recorded as `mascot3dTestBuild` in `build-mode.json`. It still refuses anything but a static build.
4. **A published build exposes only `__mascot3d.report()`,** for diagnosing a GPU. Test controls and test characters exist only in the test build.
5. **The behaviour is unchanged.** 3D runs at desktop widths on browsers that pass the capability check. Phones never load the engine or model.
   Any failure returns to the 2D mascots. The CSP and `_headers` don't change.
6. **The site says what it runs.** Text about the mascot on the Architecture page depends on the same flag, so a build never describes a mascot
   it doesn't have. The backend is still never described as hosted.
7. **The static suite tests the published build.** Headless, it sees what a visitor without a GPU sees: the 2D fallback.
   `e2e/tests/production-3d.spec.ts` makes the browser report a GPU, so the real gates let 3D run under the real headers.

## Alternatives considered

| Option                                      | Why not                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Set the variable in the Pages dashboard     | It allows merging first and switching on later, but what's published would depend on a setting outside the repository, invisible to review and to tests |
| Turn 3D on for every build                  | The full-stack build and image would carry `three` and the model with nothing to gain                                                                   |
| Publish the test build                      | It runs on software renderers and accepts test characters                                                                                               |
| Keep the static suite on a build without 3D | Simpler, but nothing would test what's actually published                                                                                               |

## Consequences

- **Cost:** none. It stays on Cloudflare Pages Free. Desktop visitors download about 162 KB of engine code and 225 KB of model and texture, after the
  page is idle; phones download neither.
- **Rollback:**
  - Immediately: roll back to the previous deployment in the Pages dashboard.
  - In the repository: remove `VITE_MASCOT_3D=1` from `build:pages`, and the static-host spec's marker with it, then push. `prepare-pages` accepts the build without it.
- **Licence:** pushing to this public repository publishes the `.glb`, even before a deploy. The owner confirmed its licence (a paid Tripo plan with "Private Models · Commercial Use") and that the model is set to Private on Tripo (2026-11-03).
- **The Blender scripts stay out of the repository** and never reach the published build. The temporary robot, which never did either, was deleted before the merge (2026-11-03).
- **CI:** `e2e-mascot3d` stays advisory until a third stable run (ADR-0010), so that job alone wouldn't stop a bad change. `e2e-static` is blocking and now covers the published build, though Pages doesn't wait for CI in any case.
