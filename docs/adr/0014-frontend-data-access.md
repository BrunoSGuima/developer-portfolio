# ADR-0014: Frontend data access, static and full-stack modes

- **Status:** Accepted (Phase 3, Step 3.2; implemented in Steps 3.3–3.4; validated in Step 3.5)
- **Date:** 2026-10-26

## Context

Phase 3 connects the React shell to the Rails API (ADR-0011) through its OpenAPI contract
(ADR-0012). The owner also set a **long-term requirement**: one React codebase on one branch must
support two explicit modes:

- **Full-stack mode:** the shell uses the Rails API and PostgreSQL.
- **Static mode:** the shell uses local data and works fully without Rails or PostgreSQL, so the
  site can stay public after the paid backend infrastructure is shut down (the full-stack site
  may be hosted for about three months).

The shell is TypeScript 6 with strict settings; the established TypeScript generator for OpenAPI
(`openapi-typescript`, latest 7.13.0) declares the peer dependency `typescript ^5.x` and can't be
installed into the shell without overriding that peer.

## Decision

### Types generated from the contract

- An **isolated generator package**, `tools/openapi-types/`: private, **not an npm workspace**,
  pinned to exact versions (`openapi-typescript@7.13.0` and its supported peer
  `typescript@5.9.3`) by its own committed `package-lock.json`, where every package carries its
  sha512 integrity. It is installed with `npm run api:types:install`
  (`npm ci --ignore-scripts`: lockfile-exact, fails on any integrity mismatch, runs no install
  scripts). The shell's TypeScript 6 never sees TypeScript 5, and no `overrides` are used.
- `npm run api:types` (`tools/openapi-types/generate.mjs`) generates
  `apps/shell/src/api/schema.ts` from `services/api/docs/openapi.yaml` (option
  `emptyObjectsUnknown`, so an untyped object is `Record<string, unknown>`), adds a "do not edit"
  header and formats it with the repository's Prettier. The file is committed and **never edited
  by hand**: change the contract, then regenerate. `npm run api:types:check` regenerates in
  memory and fails on any difference; it runs in the CI `quality` job. Generation is
  deterministic.
- Updating the generator is a reviewed change to its `package.json` and lockfile, then a
  regeneration.

### The API layer (`apps/shell/src/api/`)

- `client.ts`: `getJson` / `postJson` with relative, same-origin paths (`/api/v1/...`; the Vite
  proxies and, later, the production proxy forward them, so no base URL and no CORS), an
  optional `AbortSignal`, and one error type, `ApiError` (`status`, `code`, `message`, `details`,
  `retryAfter`). The API's error envelope keeps its status, code, message and details; a
  network failure is `network`, an abort `aborted` (with the original reason as `cause`), and a
  response that isn't the expected JSON (for example a proxy's HTML page when the API is down)
  is `invalid_response`. No retries or timeouts inside the client: callers pass a signal. No
  runtime validation library: the error envelope is checked structurally, success bodies are
  trusted (same-origin, contract-tested), and each endpoint module checks the minimal shape it
  needs.
- `types.ts` gives readable names to the generated types; `contract.ts` holds **type-only
  parity assertions**: every API `Technology` has a badge in the shell (`TechId`), and `Status`
  and `Locale` are identical on both sides. `npm run typecheck` and `build` fail when they
  diverge.
- `fixtures.ts`: test data typed with `satisfies` against the generated types.

### One view model, two sources

- The **project view model** lives in `apps/shell/src/projects/model.ts` and depends only on
  the shell's own concepts (`Localized`, `Status`, `TechId`, `Content`), never on the API's
  types or on either data source.
- The **static source** is the typed content in `apps/shell/src/content/projects.ts`, **kept
  permanently** for static mode. The **API source** is `api/projects.ts` (`fetchProjects`, with
  `toProject` mapping `slug` → `id`, `technologies` → `tech`, `url` → `href`); it is the only
  code that sees both the API's types and the model. Both produce the same `Project[]`.
- **Presentation never depends on the API layer:** an ESLint `no-restricted-imports` rule
  forbids `src/api/*` imports in `src/components/` and `src/sections/`; data loading lives
  outside them.

### The two modes (from Step 3.3)

- **Implemented in Step 3.3:** `VITE_APP_MODE` (`static` by default, `fullstack` explicitly,
  anything else fails the build), read only in `src/config/mode.ts` and baked into builds as a
  literal; the registry's `fullstack` overrides resolved by `sectionInMode()`; the Projects
  route loader in `src/projects/source.ts` (the static data, or the API as a deferred promise
  with the cache below); the API import guarded by the literal mode check at its import site, so
  a static build contains no API code at all; E2E in both modes, in CI.

- **Implemented in Step 3.4:** the Contact route's `action` (registry `action`, wired by
  `buildRoutes` like `loader`) in `src/contact/action.ts`, which loads `src/contact/submit.ts`
  (validation, the draft and `api/contact.ts`) behind the same literal check, so a static build
  gets only a stub that refuses submissions; `ContactPage` loads the form
  (`sections/contact/ContactForm.tsx`) lazily behind that check too, so a static build contains
  none of the form's code. The action returns a `ContactResult` (`src/contact/model.ts`): codes only,
  never submitted values or text, so the form renders it in either language. Client checks
  (`src/contact/validation.ts`) mirror the Rails model, normalisation and code-point lengths
  included. One shared fetcher key keeps a submission in flight and its result across a
  language switch; the draft is kept in memory only (`src/contact/draft.ts`, never Web
  Storage); a ref blocks a second submit synchronously; nothing is retried automatically.

- The mode is chosen **at build time**, explicitly, by one setting read in one module; a built
  site is either static or full-stack. Nothing is detected at runtime.
- **No silent fallback:** in full-stack mode an API failure shows an accessible error state with
  a retry; it never switches to static data.
- Static mode never loads the API client and makes no `/api` request; it is deployable without
  Rails or PostgreSQL.
- The contact form exists only in full-stack mode; static mode keeps the external channels
  (email, LinkedIn, GitHub).
- Fun Facts, registry backends and the Architecture page describe the mode that was built.
- Static data and the API's seeds stay equivalent: a full-stack test compares both **after
  normalising them to the `Project` model** (static data as-is, API responses through
  `toProject`), never their raw representations.
- Loading (3.3): a React Router loader returning a deferred promise, rendered with
  `<Suspense>`/`<Await>`, with a 5-minute cache that never stores failures, is always bypassed by
  Try again, can't be overwritten by an older in-flight response, and isn't tied to one
  navigation's abort signal. The contact form submits through a route action with `useFetcher`
  (3.4, above).

## Alternatives considered

| Option                                                     | Why not                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Install `openapi-typescript` in the shell with `overrides` | Suppresses a declared peer incompatibility instead of resolving it (owner's decision).     |
| An unlocked `npx openapi-typescript@x`                     | No lockfile, so no integrity control over the generator's dependency tree.                 |
| Handwritten types                                          | They can drift from the contract silently; kept only as the fallback if generation failed. |
| `openapi-fetch` or another generated client                | A runtime dependency for two endpoints; the hand-written client is ~100 lines.             |
| zod (or another runtime validator)                         | A runtime dependency; the API is same-origin and contract-tested.                          |
| Two branches or two apps for static and full-stack         | Duplicated code and drift; one codebase with a build-time mode is simpler.                 |
| Falling back to static data when the API fails             | Hides outages and makes the site's claims untrue; failures are shown instead.              |

## Consequences

- Contract changes show up as diffs in `schema.ts` and, when they break the shell, as type
  errors (parity assertions, mapping) before anything ships.
- The quality job installs a second, small lockfile (cached) to run the freshness check.
- Static data and seeds are two copies of the same content until the backend is retired; the
  normalised comparison keeps them equal.
- When the contract moves to OpenAPI 3.1 (once the Rails side's validator supports it), the
  generator handles it as well.
