# ADR-0007: Internationalisation (English and Brazilian Portuguese)

- **Status:** Accepted (Phase 1, Step 9)
- **Date:** 2026-10-20

## Context

The portfolio must be available in English (default) and Brazilian Portuguese. It is a React
shell whose routes, navigation, titles and Fun Facts come from the section registry (ADR-0004);
its content is typed data shaped like the future Rails models; future sections may be
independently built Vue apps mounted through the contract in ADR-0002. Requirements: type-safe
and complete translations, accessible language switching without reloads, language-specific
URLs, correct `<html lang>` and metadata, and no changes to the approved English layout.

## Decision

1. **URLs are the only source of truth.** English is unprefixed (`/about`); Portuguese lives
   under `/pt-br` (`/pt-br/about`). `/` is always English and `/pt-br` always Portuguese: there
   is no redirect, no stored preference and no browser-language detection (the owner's call).
   Refreshes, shared links, back and forward keep the language because the URL does.
2. **Routes:** `buildRoutes` generates the same section routes once per language (`/` and
   `/pt-br` subtrees, each with its own `*` 404); pages and lazy chunks are shared. Paths in the
   registry stay language-neutral; `localizePath()` adds the prefix.
3. **No i18n library.** A small typed layer in `src/i18n/`:
   - `locales.ts`: `Locale`, per-locale config (prefix, `htmlLang`, labels) and pure path
     helpers (`localeFromPath`, `stripLocale`, `localizePath`, `switchLocalePath`).
   - `messages/en.ts` defines the interface strings; `messages/pt-BR.ts` is typed `Messages`, so
     a missing or extra key fails the type check.
   - Content and registry prose are `Localized<T>` (`{ en, 'pt-BR' }`) fields next to their
     single-sourced facts (dates, links, statuses, tech ids), so languages cannot drift apart.
     `Text = string | Localized<string>` marks names that are the same in every language.
   - `RootLayout` derives the locale from the URL and provides it (`LocaleContext`);
     components use `useLocale()`, `useMessages()`, `useLocalizedPath()`, `pick()`/`text()`.
   - Tests check identical key sets, no empty strings and no untranslated copies (with an
     allowlist of words that are the same in both languages).
4. **Language switcher:** links (EN / PT) to the same page in the other language, with `lang`,
   `hrefLang`, `aria-current` and names that start with the visible label ("PT — Português
   (Brasil)"). A switch is a client-side navigation that keeps the scroll position; focus moves
   to the page heading as on any navigation. Placement keeps the English header unchanged: in
   the menu panel below 48rem, in the header's top lane above the brand at 48–64rem, inline
   after the nav from 64rem.
5. **Metadata:** `app/Metadata.tsx` renders the localized title and description, a canonical
   URL and `hreflang` alternates (en, pt-BR, x-default; none on 404s), from the route only, so
   prerendering (Phase 6) can reuse it. `VITE_SITE_ORIGIN` sets the absolute origin.
   `useDocumentLang` sets `<html lang>` before paint. `index.html` has no static description.
6. **Microfrontends** (ADR-0002 update): `SectionContext` gains `locale` (a BCP 47 tag) and a
   language-specific `basePath`; `ctx.navigate()` takes language-neutral paths and the shell
   keeps the visitor's language. A language switch matches another route subtree, so the app is
   unmounted and mounted again with the new locale: no change notification is needed. Each app
   owns its own translations (e.g. vue-i18n seeded from `ctx.locale`).

## Alternatives considered

| Option                                        | Why not (for now)                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| react-i18next / FormatJS                      | Key-based strings flatten our typed, structured content; no plural or ICU needs yet; extra dependency and typing setup. Migration stays easy. |
| One URL set + stored preference (no prefixes) | Links can't carry a language; only one language is indexable.                                                                                 |
| Redirect `/` from a stored preference         | Rejected by the owner: `/` must always be English.                                                                                            |
| Duplicated per-locale content files           | Facts (dates, links, statuses) would be copied and could drift between languages.                                                             |
| `onLocaleChange` callback for remote apps     | Unneeded: the language is part of the URL, so a switch remounts the app with the new locale.                                                  |

## Consequences

- Adding a language: a `localeConfig` entry, a `messages/<locale>.ts` dictionary and one more
  field in every `Localized` value (the type checker lists each one).
- Every new user-facing string goes into both dictionaries or a `Localized` field; components
  never hardcode text. Selectors that used to rely on English accessible names now use data
  attributes (`[data-nav="main"]`, `[data-fun-fact]`).
- Both languages ship in the main bundle (a few KB); per-locale chunks can come later.
- SEO is limited while the site is client-rendered; the metadata becomes fully effective with
  prerendering (Phase 6). The static host must serve `index.html` for every route (SPA
  fallback), which Step 11 (E2E) and Step 12 (deploy) verify.
- Longer Portuguese text is absorbed by the layout: the Home stage grows when the Fun Fact card
  is taller (the mascot's fingertip stays visible), and English stays pixel-identical.
