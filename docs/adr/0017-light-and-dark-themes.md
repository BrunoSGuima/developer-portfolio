# ADR-0017: Light and dark themes

- **Status:** Accepted (Phase 4, Step 4.6a; the night artwork integrated in Step 4.6b)
- **Date:** 2026-10-28

## Context

The portfolio gets a dark theme. Four constraints shape it:

- **Light must not change.** The light theme is the approved design.
- **The colours are already themeable.** Components use only purpose-named tokens
  (`styles/tokens.css`, ADR-0003). No CSS Module contains a raw colour.
- **No inline scripts.** Both hosts send an enforced Content Security Policy (`script-src 'self'`,
  Step 4.3; `_headers`, Step 4.4), so the usual inline "set the theme before paint" snippet isn't
  allowed.
- **The language isn't stored, but a theme can be.** The language lives in the URL only
  (ADR-0007). A theme isn't content and has no URL, so a stored preference is the only way to
  remember it.

## Decision

1. **The theme is an attribute on `<html>`:** `<html data-theme="light|dark">`, outside React, so
   it survives every navigation, language switch and remount.
   - `tokens.css` keeps the light values on `:root` (with `color-scheme: light`).
   - One `:root[data-theme='dark']` block remaps **colour tokens only**: purpose colours, badges,
     the hero scrim and shadows, plus `color-scheme: dark` for native controls and scrollbars.
   - A new `--color-surface-raised` gives floating panels (Fun Fact, menu panel) a lighter navy
     in dark, since shadows vanish there. In light it equals `--color-surface`.
   - Components never branch on the theme.
2. **The theme is set before the first paint by `public/theme-init.js`:**
   - a classic, blocking, same-origin script in `<head>`, before the stylesheets, which the CSP
     allows
   - it applies the stored choice (`localStorage['theme']`, `light` or `dark`), else the system's
     `prefers-color-scheme`, and updates `<meta name="theme-color">`
   - storage or media-query errors fall back to the system, then light
   - the site needs JavaScript anyway, so no CSS media-query copy of the dark block is kept
3. **Following the system, and choosing:**
   - `src/theme/theme.ts` holds the same logic for the app; a unit test runs the real
     `theme-init.js` and checks that the key, values and colours match.
   - While nothing is stored, a change of the system preference applies live. A choice made in
     another tab is followed too.
4. **The toggle:**
   - **Form:** a `<button aria-pressed>` named "Dark theme" / "Tema escuro", inside the same
     outlined pill as EN/PT (`components/Preferences`) in all three header layouts (menu panel,
     header lane, inline). Two separate pills made the desktop header 15px too wide at
     1024–1039px with classic scrollbars, which wrapped the brand name; the shared pill keeps
     one row (owner's choice).
   - **Behaviour:** choosing stores the preference, which then wins over the system.
   - **Appearance:** the state shows as a filled face (an outline in forced colours); the moon
     icon is decorative.
   - Switching is instant, with no transition and no layout change.
5. **The dark palette** is deep navy (`#0e1422`, `#161e30`, `#1e2840`), not an inversion:
   - warm off-white text
   - the brand's peach for links and focus
   - a cream primary button
   - the badge colours re-tinted for navy
6. **The Home illustration** (Step 4.6b): the approved day painting in light and the approved
   night painting of the same office in dark (`docs/assets/ART-BRIEF.md` §9).
   - **Sizes and alignment:** the night derivatives have exactly the day sizes. The paintings
     aren't pixel-aligned (the owner accepted them as delivered), so the backdrop crossfades
     (250 ms, `--duration-base`; instant under reduced motion) instead of jumping.
   - **No wrong image:** only the current theme's painting is requested at first. After a
     switch, the other one appears once loaded, and both stay mounted.
   - **Framing:** each painting is drawn at its natural aspect ratio, anchored at the top, which
     is the approved framing.
   - The approved art is never redrawn or filtered with CSS.

## Alternatives considered

| Option                                                 | Why not                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CSS `light-dark()` per token, driven by `color-scheme` | Works without the script, but a browser without it (Baseline only since 2024) loses every colour at once; a fallback would duplicate the light values. |
| An inline script in `index.html`                       | Blocked by the enforced CSP; a hash or nonce would weaken a policy kept identical across both hosts.                                                   |
| A three-way control (System / Light / Dark)            | Heavier in a crowded header; two states plus "follow the system until you choose" covers the need.                                                     |
| Darkening the day illustration with a CSS filter       | Alters approved artwork; a painted night version is required instead.                                                                                  |

## Consequences

- **A new colour** needs a light and a dark value; `styles/themes.test.ts` recomputes AA contrast
  for every documented pair in both themes.
- **One extra tiny request** (`/theme-init.js`). It's revalidated on Cloudflare Pages and cached
  for an hour by the full-stack image.
- **Storage:** the stored value is a single non-personal word. Blocked storage only means the
  choice lasts for the page view.
- **CI:** the axe scans and the illustration-contrast check run in both themes, and
  `e2e/tests/theme.spec.ts` covers the switching. The same five CI jobs run them.
