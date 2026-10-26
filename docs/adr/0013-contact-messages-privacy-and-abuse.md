# ADR-0013: Contact messages: privacy and abuse protection

- **Status:** Accepted (Phase 2, Step 2.0; implemented in Step 2.5)
- **Date:** 2026-10-25

## Context

The MVP adds a contact form (API in Phase 2, form in Phase 3). Visitors' messages are personal
data, and a public endpoint that writes to the database attracts spam. The owner asked for
appropriate spam protection and privacy safeguards, a 12-month retention to review before
deployment, notifications deferred, and the rate limiter's limitations documented before
deployment. No Redis, no email infrastructure and no secrets in Phase 2.

## Decision

- **Minimal data**: `name`, `email`, `message`, the page `locale` and `created_at`. No IP
  address, user agent or other tracking is stored.
- **Validation** in the model and the database: lengths (name ≤ 100, email ≤ 254 with a format
  check, message 10–5000 characters), supported locale, NOT NULL constraints. Request bodies have
  a size limit.
- **Logs**: `name`, `email` and `message` are added to Rails' parameter filter, so they never
  appear in logs.
- **Honeypot**: a hidden form field; when it is filled the API answers as if successful but
  stores nothing.
- **Rate limiting**: Rails' built-in `rate_limit` on the create action, per client IP (for
  example 5 per hour; exact values in Step 2.5), answering 429 with the standard error format.
- **Retention**: a rake task deletes messages older than **12 months**; the period is reviewed
  before deployment.
- **Retrieval**: in Phase 2 the owner reads messages with a rake task. **Before public
  deployment** a practical notification or retrieval solution must be chosen (Phase 4 gate).

## Implemented (Step 2.5, 2026-10-26)

- `POST /api/v1/contact_messages` (flat JSON body) answers **202** `{ "data": { "status":
"received" } }`, with no id (it would reveal how many messages exist and expose the
  honeypot). Other methods get 405 `Allow: POST`; **no endpoint can read messages**.
- **Two limits per client IP**, both with Rails built-ins and no new gem: Rails' `rate_limit`
  counts every request (20 per hour); a counter in the same store counts accepted messages,
  honeypot hits included (5 per hour). A visitor who makes a few validation mistakes isn't
  locked out, while abusive request volumes still are. The store is
  `config.x.rate_limit_store`, an in-memory `MemoryStore` (the limitations below apply).
- **Bodies are handled before Rails parses them** (`JsonBodyGuard` middleware). The contact
  endpoint's body must be JSON (415; blocks cross-site HTML forms), at most 32 KB (413) and a
  JSON object (400). Any other `/api` request's body is discarded unread (no other action
  takes one), so unsupported methods keep their 405 with `Allow` whatever the body. Rails
  parses bodies for its parameter log and logs the raw body of unparsable JSON at debug level,
  so this keeps personal data out of the development log.
- **Logs:** `name`, `email` and `message` in `filter_parameters` (request parameters, `inspect`,
  SQL binds). Verified pitfalls, each covered by a spec: SQL query log tags make Rails inline
  bind values into the logged SQL, so they are off in every environment; `rescue_from` logs
  the exception message, and a database error's message can contain the row, so such errors
  are rescued inside the action and only their class is logged.
- Validation codes (`blank`, `too_short`, `too_long`, `invalid`, `inclusion`) are returned per
  field, never the submitted values; NUL and other control characters are rejected (422), so
  they can't reach PostgreSQL and become a 500.
- `bin/rails contact_messages:list` (newest first, at most 20 by default, `SINCE`, a
  personal-data warning; only when invoked) and `contact_messages:purge` (older than 12 months,
  `DRY_RUN`), run by hand until Phase 4 schedules it.

## Rate limiting: known limitations (to resolve before deployment)

- Rails' `rate_limit` counts in the cache store. The default store is **per process and in
  memory**: counts reset on restart and aren't shared between processes or servers.
- It is keyed by client IP. Behind a reverse proxy the API must be configured to trust it, or
  every visitor shares the proxy's IP.
- Visitors behind one shared IP (offices, mobile carriers) share a limit; rotating IPs bypass it.
- The honeypot only stops simple bots.
- Rails' request log still records each request's IP address ("Started POST … for <ip>"); the
  database never stores it. Log retention and IP logging are to be decided with the production
  logging setup (Phase 4).

**Production requirement (Phase 4):** a cache store shared by all API processes (for example
Solid Cache on the existing PostgreSQL, avoiding Redis), correct client IPs from the proxy, and
a fresh look at whether a challenge (e.g. a privacy-friendly CAPTCHA) is needed.

## Alternatives considered

| Option                         | Why not (now)                                                              |
| ------------------------------ | -------------------------------------------------------------------------- |
| Storing IPs for abuse analysis | Personal data we don't need yet; rate limiting works without storing them. |
| CAPTCHA from the start         | A third-party dependency and friction before there is any traffic.         |
| Rack::Attack                   | An extra gem; Rails' `rate_limit` covers the need.                         |
| Email notification now         | Needs SMTP credentials and deployment; decided before Phase 4 instead.     |
| A third-party form service     | Sends visitors' data to another processor; misses the backend's purpose.   |

## Consequences

- Little personal data is held, and none forever.
- The Phase 2 rate limiter is fine for development and tests but not sufficient for production
  until the store and proxy settings above are in place.
- The contact form in Phase 3 must show a short privacy note (what is stored, why, for how
  long).
