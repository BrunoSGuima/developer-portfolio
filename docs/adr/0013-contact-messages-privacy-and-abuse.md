# ADR-0013: Contact messages: privacy and abuse protection

- **Status:** Accepted (Phase 2, Step 2.0)
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

## Rate limiting: known limitations (to resolve before deployment)

- Rails' `rate_limit` counts in the cache store. The default store is **per process and in
  memory**: counts reset on restart and aren't shared between processes or servers.
- It is keyed by client IP. Behind a reverse proxy the API must be configured to trust it, or
  every visitor shares the proxy's IP.
- Visitors behind one shared IP (offices, mobile carriers) share a limit; rotating IPs bypass it.
- The honeypot only stops simple bots.

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
