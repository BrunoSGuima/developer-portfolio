# ADR-0012: Localised data in JSONB and an OpenAPI contract

- **Status:** Accepted (Phase 2, Step 2.0; implemented in Steps 2.4–2.6)
- **Date:** 2026-10-25

## Context

The shell is bilingual (ADR-0007): content fields are `Localized<T>` objects keyed by locale
(`en`, `pt-BR`), and the URL picks the language. The Rails API (ADR-0011) must store bilingual
project content and expose it in a shape the shell can consume in Phase 3, while the two sides
stay independently testable: the owner asked for an explicit contract rather than Rails tests
that read TypeScript files.

## Decision

- **Localised text is a JSONB column** shaped like `Localized<T>`:
  `{ "en": "…", "pt-BR": "…" }`. A model validator requires exactly the supported locales with
  non-blank strings; **database check constraints** enforce the same, so bad rows can't be
  written even bypassing the model.
- **The API returns every language**; the client picks one. A language switch needs no new
  request and the URL stays the only language authority.
- **REST conventions**: versioned under `/api/v1`; resources addressed by slug; snake_case
  keys; successful responses wrapped in `{ "data": … }`; errors always
  `{ "error": { "code": "…", "message": "…", "details": { … } } }` with codes such as
  `not_found` (404), `method_not_allowed` (405, with an `Allow` header), `validation_failed`
  (422, per-field details), `rate_limited` (429), `bad_request` (400), `payload_too_large`
  (413), `unsupported_media_type` (415) and `internal_error` (500), handled in one base
  controller (and, for exceptions, Rails' `exceptions_app`; for the contact endpoint's request
  body, the `JsonBodyGuard` middleware, which discards bodies sent anywhere else so a 405
  stays a 405).
- **The contract is a handwritten OpenAPI document** (`services/api/docs/openapi.yaml`;
  **3.0.3**, see "Implemented" below).
  Rails request specs validate every request and response against it (`committee`), so it
  cannot drift from the implementation. In Phase 3 the shell checks its types and test
  fixtures against **the same document**. Neither side's tests import the other's source;
  the document is the only coupling.
- Closed vocabularies shared with the shell (technology ids, status words) are **enums in the
  OpenAPI document**. In the API they live in `Project::TECHNOLOGIES` and `Project::STATUSES`
  (Step 2.3); the status words are also a database check, the technology ids only a model
  validation (adding one needs no migration).

## Alternatives considered

| Option                                      | Why not                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| One column per language (`name_en`, …)      | Doesn't mirror `Localized<T>`; every new language is a migration on every table.            |
| Mobility (or another translation gem)       | An extra dependency and abstraction for two languages and a handful of fields.              |
| Translation tables                          | Joins and complexity without a benefit at this size.                                        |
| `?locale=` returning one language           | Extra requests on every switch; a second source of language state.                          |
| rswag (docs generated from specs)           | Ties the contract to RSpec DSL; a handwritten document is easier to review as the contract. |
| Rails tests reading `content/*.ts` or types | Couples the backend to frontend implementation files; the owner rejected it.                |

## Implemented (Step 2.4, 2026-10-26)

- **Shell side (Step 3.2):** the shell's types for this contract are generated from the
  document (`apps/shell/src/api/schema.ts`, by the locked generator in `tools/openapi-types`,
  checked for freshness in CI), and type-only assertions keep `Technology`, `Status` and `Locale`
  aligned with the shell's own vocabularies (ADR-0014).

- `GET /api/v1/projects` (published, ordered by position then slug) and
  `GET /api/v1/projects/{slug}`; nothing else is writable. Unknown, unpublished and badly
  formed slugs all get the same 404; other `/api` paths get the JSON 404; write methods on the
  project resources get **405** with `Allow: GET, HEAD`.
- **OpenAPI 3.0.3, not 3.1:** committee 5.6.4, the latest release, refuses 3.1 documents (its
  3.1 support was merged on 2026-10-20 but not yet released). The document uses nothing that
  differs between 3.0 and 3.1 (no nullable, type arrays or `const`), so moving to 3.1 later is
  a one-line change once committee releases it (owner's decision, 2026-10-26).
- committee (test group) validates every request spec, error responses included
  (`validate_success_only: false`); specs prove that an undocumented field, a missing required
  field or an undocumented error code fails validation, and that the document's enums equal
  `Project::STATUSES` / `Project::TECHNOLOGIES` and its paths equal the `/api/v1` routes.
- **Coverage (Step 2.6):** committee's `SchemaCoverage` records every documented response a
  request spec asserts; a complete RSpec run fails if any is missing, so the document can't
  describe behaviour nothing verifies. HEAD isn't a documented operation (Rails answers it like
  GET); documented 500s are exercised with controlled failures rendered as in production.
- Unexpected exceptions: **production** renders the envelope through `config.exceptions_app`
  (`Api::ErrorsController`) with the generic HTTP reason phrase, never the exception message or
  a backtrace; **development** keeps Rails' detailed error responses
  (`consider_all_requests_local`); the full error is always logged.

## Consequences

- JSONB queries by language are less convenient than plain columns (not needed: content is
  read whole).
- Changing the contract means editing the OpenAPI document first; both sides' tests then show
  what breaks.
- The technology and status vocabularies exist in the shell and in the OpenAPI document; Phase 3
  adds a shell-side check that they agree.
