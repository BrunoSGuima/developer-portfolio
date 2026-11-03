# 3D mascot: model specification

What a 3D character must provide to the working system: the behaviour already exists. The current character meets it, and is
described in [`character/bruno/README.md`](../../apps/shell/src/mascot/three/character/bruno/README.md).

## Who he is

The same person as the approved 2D mascot. The rules in [`ART-BRIEF.md`](ART-BRIEF.md) §2 apply, and the approved art in
`docs/assets/source/` is the reference.

- **Clean-shaven and without glasses.**
- **Voluminous, dark brown, wavy to curly hair,** slightly messy, with volume on top and at the sides.
- **Big, dark, friendly eyes,** a small warm smile and soft cheeks.
- **Chibi proportions:** the head is about 40% of the body's height.
- **Black or very dark charcoal suit,** white shirt, burgundy tie and black shoes.

## Designed for 48 pixels

**He appears at 48 CSS pixels tall, on the nav and on the Fun Fact card.** The model will usually be seen far smaller than it
is viewed while being made, so judge it at that size, on the real site.

- **Silhouette first:** the hair and head must read as him from their outline alone.
- **Strong eyes:** the face is mostly the eyes at this size.
- **Oversized hands:** in testing, ordinary fingers didn't separate even at 80 px, while an arm's direction read clearly. Pointing
  must read from the hand's shape and the arm.
- **Fine details won't survive:** folds, buttons and hair strands may not be visible, so they shouldn't cost much.
- **Both themes:** he must stand out on the light and dark themes, and over the illustrated Home.

## Export

| Requirement  | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| Format       | glTF 2.0 binary (`.glb`)                                   |
| Origin       | At the feet, on the ground                                 |
| Facing       | +Z, towards the viewer                                     |
| Scale        | One consistent unit: the system measures his height itself |
| Default pose | Standing, with the idle's first frame matching it          |

## What the site's security policy requires

**These are not preferences: the browser blocks anything else, and the check fails.** The site's Content Security Policy
stays as it is.

- **No images embedded in the GLB.** Use vertex colours or material colours, or a separate same-origin image, given as the profile's `look.texture`.
- **No Draco, KTX2/Basis or Meshopt compression:** their decoders need WASM or `blob:` workers.
- `KHR_mesh_quantization` is allowed, because it needs no decoder.

## Size targets

**These are initial optimization targets, not artistic limits.**

|           | Target |
| --------- | ------ |
| File size | 300 KB |
| Triangles | 10,000 |
| Bones     | 30     |

Exceeding one is a warning in the check, not a failure. **Raising a target needs measured performance on real hardware and the
owner's approval**, recorded below. If the character needs more to look right, that is a valid reason to ask.

### Approved changes to the targets

None so far.

## Animations

| Motion       | Required | Notes                                                                                                                                                                                                                                                         |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle         | Yes      | Subtle and seamlessly looping. It plays for only a few seconds at a time, then he holds still                                                                                                                                                                 |
| Walk         | Yes      | In place, seamlessly looping                                                                                                                                                                                                                                  |
| Run          | Yes      | In place, seamlessly looping                                                                                                                                                                                                                                  |
| Jump         | Yes      | In place: a crouch, flight and a landing, as one clip. Its takeoff, touchdown and end times go in the profile, and the system retimes the flight to fit the distance. The body may rise within the clip, within reason: the system keeps his head on the page |
| Sit          | Yes      | From a clip or built from bones. **Nothing may hang below the seat**: his legs and hands would cover the nav's label. Sitting and standing must blend smoothly                                                                                                |
| Point        | Yes      | **With either arm**, down and across, towards the card's content. From a clip or from bones                                                                                                                                                                   |
| Blink, smile | Optional | The stand-in robot of M1–M4 couldn't do these. They would add a lot of personality at this size                                                                                                                                                               |

**Walk and run speeds:** record how many body heights per second each covers without the feet sliding. The system moves him at
that speed.

**Motion stays short and calm.** Behaviour limits automatic motion to under 5 s so that visitors never need to pause it
(WCAG 2.2.2), and with reduced motion he holds still.

**A clip that holds a pose must animate every bone it depends on, and `Rig.applyClips` keeps it applied each frame.** Clips blend by weight, so a
partial clip can't fully override another: a full-body clip for each pose is the simple way.

## The laptop is optional

**The laptop is a separate accessory, not part of the character.**

- **Both arms stay free:** he must walk, run, jump, sit and point with either arm, and every clip must look right **without** the
  laptop.
- **A separate node:** model it as its own named node, so it can be shown or left out from the character's profile.
- **Nothing depends on it:** no animation may need it, and a model without it is still valid.

## Handing it over

1. **Send a rough version early,** before detailed art: blocked-out shapes and basic clips. Running it through the real site at
   48 px will catch problems while they're still cheap.
2. **Run the check:** `npm run mascot:check-model -- model.glb --clips Idle,Walk,Run,Jump`, with the model's own clip names.
3. **Follow the steps** in [`apps/shell/src/mascot/three/character/README.md`](../../apps/shell/src/mascot/three/character/README.md).
