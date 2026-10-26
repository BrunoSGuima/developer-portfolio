# ADR-0012: Localised data in JSONB and an OpenAPI contract

- **Status:** Accepted (Phase 2, Step 2.0)
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
  `not_found` (404), `validation_failed` (422, per-field details), `rate_limited` (429),
  `bad_request` (400) and `internal_error` (500), handled in one base controller.
- **The contract is a handwritten OpenAPI 3.1 document** (`services/api/docs/openapi.yaml`).
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

## Consequences

- JSONB queries by language are less convenient than plain columns (not needed: content is
  read whole).
- Changing the contract means editing the OpenAPI document first; both sides' tests then show
  what breaks.
- The technology and status vocabularies exist in the shell and in the OpenAPI document; Phase 3
  adds a shell-side check that they agree.
