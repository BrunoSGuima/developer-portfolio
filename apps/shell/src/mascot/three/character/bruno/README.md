# The character

The 3D version of the approved 2D mascot. The 2D art stays the source of truth, and takes over on any failure.

| File         | What it is                                                                     |
| ------------ | ------------------------------------------------------------------------------ |
| `bruno.glb`  | 3,820 triangles, 22 bones, 7 clips, quantized. 184 KB, with no image inside it |
| `base.webp`  | Its base colour, 512 px, 41 KB: a separate same-origin file, as the CSP needs  |
| `profile.ts` | Its measurements, jump timings, required parts and look                        |
| `pose.ts`    | Turns a `PoseIntent` into clip weights                                         |

## Clips

`Idle`, `Walk`, `Run`, `Jump`, `Sit`, `PointL` and `PointR`. Each animates the whole body, so weights add up to 1 and any pose blends into
any other. Idle's first frame is the rest pose. Walk and run come from a footprint locked to the ground, and `walkSpeed` and `runSpeed` in the
profile are the speeds at which the feet don't slide: change the clips and they must change too.

Pointing is the arm and the closed fist: there are no fingers. The spec says ordinary fingers don't separate at 48 px.

## Look

Unlit, so nothing about the scene's lighting applies. The light theme has a fine outline (`look.ts`). The dark theme has a soft CSS halo and no
outline (`mascot3d.css`): dark clothes on a dark page need the help, and an outline wouldn't give it. The engine follows theme changes live.

## Size

`SCALE` in `profile.ts` draws him larger than the layout's `size`, and is 1.25, approved by the owner. The rule that every pose must fit above the nav's focus ring limits him to about 57 px on the current header, so that's what 1.25 gives there (119% of the approved 48 px). His measurements multiply with it, so the layout always knows his real size, and his clips stay at
their own speed: a larger character covers more ground per step, so he also moves faster across the page, and his feet still don't slide. At 1 he is the size approved in Stage C.

## Provenance

- **Base model:** generated with Tripo AI by the owner, then reworked: figure 1 of the generated file, with the arms separated from the torso, the eyes
  and hair cleaned, the mesh repaired, and joints, skin weights and clips added.
- **Licence, confirmed by the owner (2026-11-03):** generated and downloaded under the owner's paid Tripo plan, which includes "Private Models · Commercial Use",
  and the model is set to Private on Tripo (`poc/mascot-3d/M5-REPORT.md`).
- **Build scripts:** Blender scripts, kept out of this repository. Blender's FAQ says published scripts using its Python API must be GPL, and that decision
  is still open. The model and its texture are committed output, in the same way as the WebP illustrations.

The reasoning and measurements are in `poc/mascot-3d/M5-REPORT.md`.
