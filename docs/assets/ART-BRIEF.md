# Art brief: Home hero and mascot illustrations

This brief describes the illustration assets needed to reproduce the Home page in
[`homepage.png`](./homepage.png) faithfully, and the Fun Fact mascot in
[`funfact.png`](./funfact.png). The assets will be layered under **real HTML**. The heading,
paragraph, buttons, Fun Fact card and its badges are **not** part of any image.

- **Status:** assets to be produced and approved before implementation (Step 7, Phase B).
- **Primary source of truth:** `homepage.png`. Secondary: `funfact.png`.
- `mascot-reference.png` is useful for poses and props only. **Its characters wear glasses; ours
  must not.**

> **Dimensions are targets, not rigid requirements.** Visual fidelity to the references and
> consistent proportions between assets matter more than exact pixel sizes. What must hold are
> the **alignment rules** (§3) and the **relative scale** between assets (§4).

---

## 1. Why new assets are needed

The references are **flattened mockups**, not layered art:

| File                   | Size           | Notes                                                                      |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| `homepage.png`         | 548 × 405 px   | Fully opaque, one bitmap: header, text, card, mascot, props and background |
| `funfact.png`          | 384 × 265 px   | Fully opaque                                                               |
| `mascot-reference.png` | 1536 × 1024 px | Multi-panel sheet; characters about 150 px tall, **with glasses**          |

Independent layers can't be extracted faithfully. Pixels hidden behind the mascot, card and
props don't exist, and the resolution is far too low: the mascot is about 190 px tall, and a
desktop hero needs about 900 px. Every layer below must therefore be **created**, in one
consistent style.

---

## 2. Global style rules (apply to every asset)

**Character**: the same person in every asset:

- **Clean-shaven: no beard, no moustache.**
- **No glasses.**
- **Hair:** voluminous, dark brown, wavy to curly, slightly messy, with volume on top and sides.
- **Face:** big, dark, friendly eyes; a small warm smile; soft cheeks; a youthful chibi
  proportion (head about 40% of the body height, as in `homepage.png`).
- **Outfit:** black or very dark charcoal suit jacket and trousers, white shirt, **burgundy tie**,
  black shoes.

**Illustration style** (match `homepage.png`):

- Polished cartoon or chibi digital illustration: clean dark outlines, soft cel shading with
  gentle gradients, and subtle highlights on the hair and suit.
- **Lighting:** warm and soft, from the **upper left**. Shadows fall to the lower right. Every
  asset uses the same light direction.
- No hard black drop shadows. Use soft contact shadows only (see the per-asset notes).

**Palette:** keep the warm look of the references. These site tokens should feel at home
next to the art:

| Token     | Hex       | Use in the art           |
| --------- | --------- | ------------------------ |
| charcoal  | `#2a2b30` | suit, outlines           |
| burgundy  | `#802b2a` | tie                      |
| peach     | `#fac593` | skin highlights          |
| warm grey | `#9d928f` | shadows, floor details   |
| slate     | `#738297` | laptop, cool accents     |
| cream     | `#fcf5ed` | light surfaces, mug      |
| sand      | `#e9e2dd` | wall and background base |

**Text inside images:** the **only** text allowed is on the props, and it must be in
**English**:

- books: `CODE`, `STRATEGY`, `SOLUTIONS`
- mug: `COFFEE`, `CODE`, `PROGRESS`
- laptop screen: `</>`

No other text, logos, watermarks or signatures.

**Orientation convention:** "his left / his right" means the **character's own** left and
right. When he faces the viewer, his left side appears on the **viewer's right**.

**File format for delivery:**

- PNG, sRGB, 8-bit per channel.
- Transparent assets need a **true alpha channel**: a clean edge with no halo, no fringe from a
  previous background, and no white or green outline.
- If the generation tool can't export transparency, deliver the image on a **flat, uniform
  `#FF00FF` background**, and say so. Background removal will then be done and checked separately.
  Expect a small risk of edge fringe.

---

## 3. Assets

### A1: `hero-background-desktop.png`

|                  |                                                                          |
| ---------------- | ------------------------------------------------------------------------ |
| Transparency     | **Opaque**                                                               |
| Target size      | about **2880 × 1200 px** (2.4 : 1)                                       |
| Must contain     | the continuous room backdrop only                                        |
| Must not contain | the character, text, card, books, mug, plants, laptop, header or buttons |

**Description:**

- One **continuous** warm room scene spanning the **whole hero width**: a soft beige wall and a
  light floor, with a soft horizon or floor line at about **85% of the height**.
- **Left side (about 0–45% of the width):** a **calm, light, low-detail** area. The real heading,
  paragraph and buttons sit here, and dark text (`#2a2b30`) must stay clearly readable on it.
- **Right side:** gentle depth, such as a slightly darker wall and soft blurred shapes, so the
  props and mascot sit naturally.
- **The top edge continues** behind the site header, which in the reference floats as a white
  rounded card. Keep the top 12% plain and calm.
- **No vignette** strong enough to darken the text area.

### A2: `hero-background-mobile.png`

|              |                                                  |
| ------------ | ------------------------------------------------ |
| Transparency | **Opaque**                                       |
| Target size  | about **1080 × 1600 px** (portrait, about 2 : 3) |

**Description:**

- The **same room** as A1, re-composed for portrait. Not a crop of A1: same style, same
  colours, same light.
- **Top 45%:** calm and light, for the heading, paragraph and buttons.
- **Lower 55%:** the room and floor, where the mascot, card and props will sit. The floor line is at
  about **88% of the height**.

### A3: `mascot-presenting.png` (Home hero)

|              |                                                                              |
| ------------ | ---------------------------------------------------------------------------- |
| Transparency | **Transparent**                                                              |
| Target size  | figure about **900 px tall**, on a canvas with about 40 px padding all round |

**Pose** (from `homepage.png`):

- **Stance:** standing, full body, facing the viewer with a **slight three-quarter turn** toward
  the viewer's right. Feet slightly apart, standing naturally.
- **Pointing arm:** **his LEFT arm (on the viewer's RIGHT) is raised, pointing UP and to the RIGHT**,
  with the **index finger extended**. The hand is at about head height, a little to the right
  of his head.
- **Laptop hand:** **his RIGHT hand (on the viewer's LEFT) holds a CLOSED grey laptop VERTICALLY at
  his side**. The laptop hangs down along his leg and is held by its edge. It's **not** tucked
  under the arm and **not** open.
- **Accents:** two or three small **yellow motion accent strokes** near the pointing fingertip,
  as in the reference.
- **Expression:** smiling, eyes looking toward the viewer or slightly toward the pointing hand.
- **Outfit and character:** per §2. **No glasses, no beard.**

**Shadow:** none baked into the figure. If possible, deliver a separate
`mascot-presenting-shadow.png`: a soft elliptical contact shadow under the shoes, with the same
canvas size and alignment.

**Alignment rule:** the **soles of the shoes** sit on one horizontal line. Record that line's
distance from the bottom of the canvas (e.g. "baseline at 40 px from bottom").

### A4: `hero-props.png` (desk scene group, not displayed; see §8)

|              |                         |
| ------------ | ----------------------- |
| Transparency | **Transparent**         |
| Target size  | about **1400 × 800 px** |

**Composition, left to right,** as in `homepage.png`:

1. A **small plant in a terracotta pot**: a few broad green leaves, on the floor line.
2. A **stack of three dark navy books**, lying flat, spines facing the viewer. The labels read,
   **top to bottom: `CODE`, `STRATEGY`, `SOLUTIONS`**, in light cream capitals, with visible
   page edges.
3. A **white or cream mug in front of the books' right edge**, slightly overlapping them, with
   the handle on the right. It's labelled on three lines: **`COFFEE` / `CODE` / `PROGRESS`**.
4. A **large leafy plant behind** the books and mug, taller than the book stack, with its pot
   mostly hidden.
5. A **dark laptop at the far right**, screen open and facing slightly left, showing **`</>`**,
   partly behind the mug.

**Details:**

- Every object has its **own soft contact shadow**, consistent with the upper-left light.
- Deliver the laptop **complete**. The website will crop it at the screen edge when needed.
- All objects share **one floor line** (their bottoms). Record its distance from the bottom of
  the canvas.

**Scale relative to A3:** the top of the book stack reaches about the mascot's **knee to hip**
height. The large plant's top reaches about his **shoulder** height.

### A5: `mascot-peeking.png` (Fun Fact card on the other pages)

|              |                        |
| ------------ | ---------------------- |
| Transparency | **Transparent**        |
| Target size  | about **600 × 500 px** |

**Pose** (from `funfact.png`):

- **What shows:** the same character seen from the **chest up**, peeking over an invisible
  ledge.
- **Hands:** **both hands rest on top of the ledge**, fingers curled over it, roughly in line with
  his shoulders and on either side of his body.
- **Expression:** a friendly smile, looking at the viewer.

**Alignment rule (critical):**

- The **bottom edge of both hands must lie on one straight horizontal line**: the ledge.
- Everything **below** that line will be hidden behind the Fun Fact card, so it may be
  unfinished or simply stop.
- Record the line's distance from the top of the canvas (e.g. "ledge at 330 px from top").

**Outfit and character:** per §2. **No glasses, no beard.**

### A6: `mascot-walk-*.png` (header walker, later)

These four frames are needed only to replace the header placeholder. **Not required for the
first Phase B.**

| Frame                    | Pose                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `mascot-walk-idle.png`   | standing, arms relaxed                                                |
| `mascot-walk-step-1.png` | mid-stride, his left foot forward                                     |
| `mascot-walk-step-2.png` | mid-stride, his right foot forward                                    |
| `mascot-walk-point.png`  | standing, **his left arm (viewer's right)** pointing down and forward |

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| Transparency | **Transparent**                                                    |
| Target size  | figure about **256 px tall**; **all four on the same canvas size** |

**Alignment rule:** identical canvas size and **identical foot baseline** in every frame, so
swapping frames never makes the character jump. All frames face **the viewer's right**; the site
mirrors them for walking left.

---

## 4. Intended placement (for reference; the website does the layering)

The positions below are measured from `homepage.png` and given as **percentages of the hero
band**: from just below the header to the bottom of the hero, full width.

```
┌──────────────────────────────── hero band (A1 background, full width) ───────────────┐
│  [ HTML heading ]                                        ┌───── Fun Fact card ─────┐ │
│  [ HTML paragraph ]                                      │  real HTML, on top      │ │
│  [ HTML buttons ]                         (A3) ☝ ──────▶ └──────────────────────────┘ │
│                                         mascot          (A4) plant · books · mug · laptop │
│ ─────────────────────────────────────── floor line ──────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Layer (back to front) | Horizontal                                | Vertical                                   | Notes                               |
| --------------------- | ----------------------------------------- | ------------------------------------------ | ----------------------------------- |
| A1 background         | 0–100%                                    | 0–100%                                     | continuous; text zone on the left   |
| A4 props              | from about **62%** to past the right edge | top about **47%**, floor at about **96%**  | cropped at the right edge if needed |
| A3 mascot             | about **44–71%**                          | head top about **18%**, feet about **96%** | about **78% of the band height**    |
| Fun Fact card (HTML)  | about **58–97%**                          | about **7–36%**                            | always the top layer                |
| Hero text (HTML)      | about **5–46%**                           | vertically centred                         | over A1's calm zone                 |

**Key relationship:** A3's **pointing fingertip** (his left hand, on the viewer's right)
ends **just below and to the left of the card's lower-left corner**, at about **67%
horizontally and 48% vertically**. The figure's scale and arm angle must make this possible.

**`funfact.png` (other pages):** the card spans the content width. A5 sits behind it,
**left of centre**, with its horizontal centre at about **30–35%** of the card's width from the
card's left edge. The **ledge line sits exactly on the card's top edge**. The visible part
(head, shoulders, hands) is about **60%** of the card's height.

**Mobile (A2):** the text sits at the top, then the scene. The card overlaps the upper part of the
scene, and the mascot stands below-left of it, pointing up at it (his left arm, on the viewer's
right). The props are smaller and may be partly cropped.

---

## 5. Acceptance checklist (per asset)

Use this before handing assets over. Phase B begins with an automated check of the measurable
items, and I'll report any problem before using an asset.

**All assets:**

- [ ] Same character as `homepage.png` and `funfact.png`: hair, face, proportions, style.
- [ ] **No glasses. No beard. No moustache.**
- [ ] Light from the upper left, with consistent soft shading.
- [ ] sRGB PNG; no watermark, signature or stray text; any text is in English.

**A1 / A2 (backgrounds):**

- [ ] Opaque; continuous scene; no character, props or UI.
- [ ] The text zone (left on A1, top on A2) is calm and light enough for dark text.
- [ ] The A1 top area continues behind the header.

**A3 (`mascot-presenting`):**

- [ ] Transparent with a clean edge.
- [ ] **His LEFT arm (viewer's RIGHT) points up-right**, index finger extended, with yellow
      accent strokes near the fingertip.
- [ ] **His RIGHT hand (viewer's LEFT) holds the CLOSED laptop VERTICALLY at his side.**
- [ ] Full body; shoes on a single baseline (distance recorded).

**A4 (`hero-props`):**

- [ ] Transparent with a clean edge; objects left to right as specified.
- [ ] Mug in front of the books' right edge; large plant behind; laptop complete at the far right.
- [ ] Labels exactly `CODE` / `STRATEGY` / `SOLUTIONS` and `COFFEE` / `CODE` / `PROGRESS`; `</>` on
      the laptop.
- [ ] A shared floor line (distance recorded); soft contact shadows.

**A5 (`mascot-peeking`):**

- [ ] Transparent; chest up; **both hands' bottom edges on one straight line** (distance recorded).

**A6 (walk frames, later):**

- [ ] Four frames, same canvas size, same foot baseline, facing the viewer's right.

---

## 6. Copy-ready generation prompts

Attach `homepage.png` (and `funfact.png` for A5) as the **style and character reference**
with every prompt. Generate A3, A5 and A6 in the **same session** if the tool supports it, to
keep the character consistent.

**A1 (desktop background):**

> Wide 2.4:1 illustration of a warm, softly lit room backdrop for a website hero, in the exact
> illustration style of the attached reference: soft beige wall, light warm floor, a soft floor
> line near the bottom, gentle depth and blurred shapes on the right side. The left 45% must be
> calm, light and low-detail so dark text can sit on it. No people, no characters, no furniture,
> no books, no plants, no laptop, no text, no logos, no UI. Light from the upper left.

**A2 (mobile background):**

> Portrait 2:3 version of the same warm room backdrop, same style, colours and light. The top
> 45% is calm and light for text; the room and floor are in the lower part, with the floor line near
> the bottom. No people, no objects, no text, no UI.

**A3 (presenting mascot):**

> Full-body chibi cartoon character, exactly the character in the attached reference (same
> voluminous dark brown wavy hair, big friendly dark eyes, warm smile, clean-shaven, NO
> glasses, NO beard), wearing a black suit, white shirt, burgundy tie and black shoes. Standing,
> facing the viewer with a slight three-quarter turn to the viewer's right. HIS LEFT ARM (on the
> viewer's right side of the image) is raised, pointing up and to the right with the index finger
> extended, hand at about head height, with two or three small yellow motion strokes near the
> fingertip. HIS RIGHT HAND (on the viewer's left side of the image) holds a closed grey laptop
> vertically at his side, hanging down along his leg. Same illustration style, outlines and soft
> shading as the reference, light from the upper left. Transparent background, no shadow, no
> text.

**A4 (props group):**

> Transparent-background illustration in the exact style of the attached reference, one group
> of objects on a shared floor line, left to right: a small plant in a terracotta pot; a stack
> of three dark navy books lying flat with cream capital labels reading, top to bottom, "CODE",
> "STRATEGY", "SOLUTIONS"; a white mug in front of the books' right edge, labelled on three lines
> "COFFEE", "CODE", "PROGRESS", handle on the right; a large leafy green plant behind the books and
> mug; and a dark open laptop at the far right showing "</>" on its screen, partly behind the
> mug. Soft contact shadows, light from the upper left. No other text, no people.

**A5 (peeking mascot):**

> The same chibi character as the attached reference (voluminous dark brown wavy hair, big
> friendly eyes, smile, clean-shaven, NO glasses, NO beard, black suit, white shirt, burgundy
> tie), seen from the chest up, peeking over an invisible ledge with BOTH HANDS resting on top
> of the ledge, fingers curled over it. The bottom edges of both hands lie on one straight
> horizontal line. Friendly expression, looking at the viewer. Same style and soft shading, light
> from the upper left. Transparent background, no text.

**A6 (walk frames, later):**

> Four frames of the same chibi character (same hair, face, outfit, clean-shaven, NO glasses),
> each on an identical canvas with the feet on the same baseline, all facing the viewer's right:
> (1) standing idle, arms relaxed; (2) walking, his left foot forward; (3) walking, his right
> foot forward; (4) standing, his left arm (on the viewer's right) pointing down and forward.
> Same style as the reference, transparent background, no text.

---

## 7. Delivery

- **Where:** place the source PNGs in `docs/assets/source/` with the file names above. Add a
  short note with the recorded baselines (A3 feet, A4 floor line, A5 ledge, A6 feet).
- **Repository size:** source PNGs can be several MB each. Decide in Phase B whether to commit the
  sources or keep them outside the repository and commit only the optimised WebP files the site
  uses.
- **Approval:** you approve the assets visually first. Phase B (layout and replacing the
  placeholder SVG art) starts only after that.

---

## 8. As delivered (Step 7, Phase B)

The approved assets are in `docs/assets/source/`, kept **byte-identical**. The site uses WebP
derivatives built by `npm run illustrations -w apps/shell` (into
`apps/shell/src/assets/illustrations/`, with a `manifest.json` of their dimensions).

| Asset | File                          | Delivered          | Notes                                                                                                                                                                                                                    |
| ----- | ----------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1    | `hero-background-desktop.png` | 1174 × 645, opaque | Detailed painterly office (bookshelf, posters with text, desk with books and a mug). Busier and lower resolution than §3 asked; **approved as-is**. Text contrast is handled with a cream scrim.                         |
| A2    | `hero-background-mobile.png`  | 433 × 829, opaque  | Has a white strip in its first 18 columns: **cropped off in the derivative** (415 × 829).                                                                                                                                |
| A3    | `mascot-presenting.png`       | 1154 × 1363, RGBA  | Converted from a white-background BMP to RGBA (edge-connected removal, colour-to-alpha edges). Fingertip ≈ 86% / 33% of the canvas; shoes at y = 1336.                                                                   |
| A4    | `hero-props.png`              | 1993 × 789, RGBA   | Alpha cleaned (245–254 → 255, 1–2 → 0); colours untouched. **Not displayed:** removed from the Home hero after review (the A1 backdrop already shows books, a mug and plants). Kept as a source; no derivative is built. |
| A5    | `mascot-peeking.png`          | 1608 × 978, RGBA   | Same alpha clean-up. **Ledge at y = 918**; fingertips to y = 945 (drawn in front of the card).                                                                                                                           |

To use a higher-resolution version of any asset: replace the source PNG (same file name), run
`npm run illustrations -w apps/shell`, and commit the regenerated WebP files and manifest.

**A3's emphasis marks (Step 4.6b, owner's decision, 2026-10-28):** the three small orange strokes
beside the pointing finger are removed **from the web derivatives only**; the approved source
stays byte-identical.

- **How:** they are three separate opaque islands (2,217, 1,972 and 1,799 px), at least 31 px from
  the mascot. `build-illustrations.mjs` (`removeEmphasisMarks`) makes exactly those islands
  transparent.
- **Guard:** it refuses to build unless it finds exactly three small, mostly orange islands in
  the expected place, so a changed source can never lose anything else.
- **Unchanged:** the canvas size (the stage geometry and the fingertip ratio), every mascot
  pixel and the favicons (head crop).
- **Tests:** `apps/shell/scripts/build-illustrations.test.ts`.

## 9. Night variants (Step 4.6b; delivered, approved and integrated)

Dark mode (ADR-0017) shows a night version of the Home backdrop. The approved day art is never
redrawn or filtered.

| Asset | File                                | Delivered          | Notes                                                                                                                   |
| ----- | ----------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| A1N   | `hero-background-desktop-night.png` | 1692 × 930, opaque | The office at night: lamp on, deep-blue sky, a lit waterfront. Scaled to A1's derivative sizes (1174 × 645, 800 × 440). |
| A2N   | `hero-background-mobile-night.png`  | 887 × 1773, opaque | Matches A2 **after** its strip crop (no strip of its own). Scaled to 415 × 829.                                         |

**Approved as delivered (owner, 2026-10-28):**

- **Not pixel-aligned with A1/A2** (measured with edge maps):
  - **Desktop:** the desk edge at row 550 vs 530 at 645 px tall, the posters and window 15–25 px
    off.
  - **Mobile:** the desk edge at 591 vs 630 at 829 px tall, the posters, window, chair and mug
    reframed.
  - No uniform zoom or shift aligns them.
- **Decision (option 1):** integrate them as they are; the backdrop crossfades on a switch (ADR-0017).
- **Scaling:** at most 0.07% difference between the width and height scale factors, never
  cropped (`MAX_DISTORTION`, `matches` in `build-illustrations.mjs`).
- **Each painting is drawn at its natural aspect ratio, anchored at the top** (the approved
  framing), in both themes. `e2e/tests/theme.spec.ts` guards it.
- **Contrast:** the hero text keeps ≥ 4.5:1 over the night art with the navy scrim (70%;
  `e2e/tests/accessibility.spec.ts`).

**To replace a night painting:**

1. Keep the file name and the aspect ratio.
2. Run `npm run illustrations -w apps/shell`. The build refuses more than 0.5% distortion.
3. Re-check the contrast and the framing in both themes.
