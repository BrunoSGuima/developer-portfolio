# The 3D character

Everything about what the character is lives here. Everything about what it does (when it moves, where
it goes, how it reacts) lives one folder up and knows the character only through `contract.ts`, so one
can change without touching the other. `boundary.test.ts` enforces that.

| Path          | What it is                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| `contract.ts` | What a character provides: its measurements, jump timings, required parts, and how it poses |
| `index.ts`    | Chooses the active character: its last line is the one to change                            |
| `validate.ts` | Checks a loaded model has what its profile requires. If not, the visitor gets the 2D mascot |
| `bruno/`      | **The character**, and what it is made of                                                   |
| `robot/`      | The CC0 robot that stood in for him. Kept until the owner approves deleting it              |
| `fixture/`    | Test character, made of boxes, with nothing in common with a real model                     |

## Replacing the character

The model's requirements are in [`docs/assets/MASCOT-3D-SPEC.md`](../../../../../../docs/assets/MASCOT-3D-SPEC.md).

1. **Check the file:** `npm run mascot:check-model -- <model.glb> --clips Idle,Walk,Run,Jump`. Problems (what the site's
   CSP blocks, or a missing clip) must be fixed. Warnings are size targets to review.
2. **Add a folder** beside `robot/`, with the GLB and two files, using `robot/` as the example:
   - `profile.ts`: the model's URL, required clips and nodes, jump timings, measurements, and any accessories.
   - `pose.ts`: turns a `PoseIntent` into clips and bones, however this model does it.
   - Optionally a `look`: a same-origin texture drawn unlit, an outline for the light theme, a halo for the dark one.
3. **Point `index.ts` at it.**
4. **Measure it:** with the flagged build running, call `__mascot3d.measurePose({})`, `measurePose({ sit: 1 })`,
   `measurePose({ point: 1, arm: 'L' })` and `jumpReach(24)` in the console, and copy the results into `metrics`.
5. **Run `npm run test:e2e:mascot3d`.** The test "a character's profile matches its pixels" fails if a measurement is out of
   date. The other tests check its behaviour on the nav and the card.
6. **Delete the old character** when the new one is approved. No behaviour code needs to change.

## What a character must be able to do

Walk, run, jump, sit, and point with **either arm**. Accessories, such as the laptop, are separate and optional: a named node
in the model, listed under `accessories`. No motion may depend on one, and a missing one isn't an error.
