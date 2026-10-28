# ADR-0015: Deployment architecture: a temporary full stack, then a permanent static site

- **Status:** Accepted (Phase 4, Step 4.1; implemented in Steps 4.2–4.11, see `docs/ROADMAP.md`;
  Step 4.4 prepared Stage B: `deploy/cloudflare-pages`, `build:pages`, the static suite under
  the Pages emulator; Step 4.2 built the image: `Dockerfile`, `ShellAssets`, `bin/release`; Step 4.3 hardened it:
  required `ALLOWED_HOSTS`, optional `TRUSTED_PROXIES`, `SecurityHeaders` with an enforced CSP,
  IP-free request logs, a database-aware `/up`)
- **Date:** 2026-10-27

## Context

The MVP is complete (Phase 3, `f66efbf`): one codebase builds a **full-stack** site (React shell,
Rails API, PostgreSQL) or a **static** site (local data, no backend), chosen at build time
(ADR-0014). Nothing is deployed yet.

The owner's goals:

- show the complete React + Rails + PostgreSQL integration publicly for **about three months**;
- then keep the portfolio online **at no hosting cost**, without the backend;
- one repository, one `main` branch, both build modes; the full-stack code and its CI kept as
  evidence after the backend is retired;
- minimal infrastructure complexity and recurring cost.

Constraints already in the code:

- The shell calls the API same-origin (`/api/v1/...`, relative paths), with no CORS (ADR-0011,
  ADR-0014).
- The contact form's rate limits key on `client_ip`, which believes forwarded headers only from
  trusted peers (ADR-0013). The rate-limit store is in memory: correct for one instance running
  one Puma process (the current `config/puma.rb` has no workers).
- The static build makes no `/api` request and contains no API or form code (checked in CI).

The hosting options were researched on 2026-10-27 (provider pricing pages and docs). **Prices and
provider capabilities in this ADR are provisional**: they are verified again before anything is
provisioned (Step 4.5), and every expense needs the owner's explicit approval.

## Decision

1. **Two stages, one public domain.**
   - **Stage A (temporary, about three months):** the full-stack build on **Render** (preferred
     provider, subject to verification).
   - **Stage B (permanent):** the static build on **Cloudflare Pages**.
   - An owner-registered custom domain with DNS on Cloudflare: **DNS-only** (not proxied) during
     Stage A, so the visitor's address reaches Rails through a single, known proxy hop. The
     cutover is a DNS change; the URL never changes.
2. **Stage A: one Docker service, one origin.**
   - A multi-stage image: Node 22 builds the shell with `npm run build:fullstack`; the runtime
     stage is the official `ruby:4.0.9-slim`, running Rails 8.1 as a non-root user.
   - **Rails serves everything from one origin:** the shell's files (hashed assets with a long
     cache lifetime, `index.html` uncached), an SPA fallback to `index.html` for page URLs, and
     `/api`. No separate reverse proxy, no CORS, no change to the shell's relative `/api` calls.
   - **Managed PostgreSQL 18** from the same provider, reachable on its private network only.
   - **The 12-month retention** is enforced by a verified procedure (the purge task,
     `bin/rails contact_messages:purge`); whether it runs as a scheduled job is decided in Step
     4.7 (see Consequences).
   - **Infrastructure as code:** a `render.yaml` blueprint in the repository with environment
     variable **names** only; secret values (`SECRET_KEY_BASE`, `DATABASE_URL`) are set in the
     provider's dashboard. The app reads no Rails credentials, so `RAILS_MASTER_KEY` is not
     needed and `config/master.key` is never uploaded.
3. **Stage B: the static build on Cloudflare Pages.**
   - Pages builds `npm ci --ignore-scripts && npm run build:pages` from `main` (with
     `SKIP_DEPENDENCY_INSTALL=1` and `VITE_APP_MODE=static`), output `apps/shell/dist`, Node
     from `.nvmrc`; automatic branch and pull-request previews are off.
   - The SPA fallback is Pages' default (no top-level `404.html`); `assets/404.html` gives
     missing assets a real 404; security headers come from `deploy/cloudflare-pages/_headers`,
     identical to Stage A (parity-tested). No API, no database, no secrets. Prepared in Step 4.4,
     emulated in CI with `wrangler pages dev`; see `deploy/cloudflare-pages/README.md`.
   - It is deployed and tested on a `*.pages.dev` preview **before** Stage A starts, so it is a
     ready fallback throughout.
4. **One codebase, both modes, kept.** Both builds come from the same commit. The full-stack
   code, the `Dockerfile`, `render.yaml` and the four CI jobs (`quality`, `api`, `e2e`,
   `e2e-static`) stay after Stage B. Nothing detects the mode at runtime.
5. **Deployment gates.** Render deploys `main` only after the GitHub checks pass, or by manual
   deploy (the option is verified in Step 4.5). No deploy secrets are added to GitHub Actions;
   CI keeps its read-only token.
6. **Spending.** No paid resource, purchase or plan change happens without the owner's explicit
   approval, recorded in the ROADMAP's spending log. Planning ceiling for Stage A: **US$ 20/month**,
   excluding the domain (a budget, not a provider-enforced limit).

### Deployment lifecycle

1. **Prepare (no cost):** the production container and hardening, tested in CI (Steps 4.2–4.3);
   the static site on a Pages preview (4.4); the provider verified against this ADR's open items
   (4.5, go/no-go).
2. **Provision Stage A (approved spending):** the database, web service and any scheduled job,
   on the provider's own URL; the client-IP chain verified; production smoke checks (4.6).
3. **Operate safely:** backups and a restore drill, the retention procedure verified, the
   monthly review runbook, monitoring (4.7); the privacy and logging review (4.8).
4. **Go live:** the domain registered (approved purchase), DNS, production smoke checks (4.9).
5. **Cut over to Stage B:** the domain moves to Pages; the static site is verified on it; the
   backend stays for a 7-day rollback window (4.10).
6. **Retire the backend:** the stored contact messages reviewed (only legitimate messages that
   still need a follow-up exported, encrypted and themselves deleted under the policy; the rest
   deleted), the backend and database deleted, a $0 bill confirmed, the deployment history
   documented (4.11).

### Rollback strategy

- **A bad deploy in Stage A:** the provider's rollback to the previous deploy (verified in 4.5),
  or `git revert` and a redeploy. Database migrations stay backward compatible (expand first,
  contract in a later deploy), so the previous release can run against the current schema.
- **Stage A broken, unaffordable or abandoned at any time:** point the domain at the
  already-validated static site. Stage B is always a ready fallback.
- **A problem after the Stage B cutover:** point DNS back to Render. This works only while the
  backend exists, so it is deleted only after **7 days** of a stable Stage B.
- **Data:** daily backups and point-in-time recovery during Stage A (verified and drilled before
  go-live). Deleting the backend is irreversible, which is why the message review comes first.

## Alternatives considered

| Option                                                           | Why not                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A VPS (Hetzner) with Docker Compose and Caddy (the earlier plan) | Cheapest (about €7/month at the time) but adds OS patching, firewall, PostgreSQL backups and monitoring; its EU plans were shown as "currently unavailable". |
| Fly.io with Neon PostgreSQL                                      | Two providers; Neon's free tier scales to zero (cold starts); PostgreSQL 18 support not stated; Fly has no free tier.                                        |
| Railway                                                          | Usage-based billing, hard to predict; database backups self-managed.                                                                                         |
| Render's free tier                                               | Web services spin down after 15 minutes idle (about a minute to wake); free databases expire after 30 days and have no backups.                              |
| A Render static site rewriting `/api` to the API service         | POST and `X-Forwarded-For` handling through the rewrite are undocumented.                                                                                    |
| A Cloudflare Worker proxying `/api`                              | More code; the rate-limit key would become a Cloudflare address unless Cloudflare's ranges are trusted.                                                      |
| GitHub Pages, Netlify or Vercel for Stage B                      | No custom headers and only the `404.html` trick for deep links (GitHub Pages); credit caps (Netlify); stricter Hobby terms and caps (Vercel).                |
| A cross-origin API with CORS                                     | Contradicts ADR-0011 and adds attack surface.                                                                                                                |

## Consequences

- **Same-origin by construction:** the shell and its tests don't change; `client_ip` and the
  in-memory rate limits stay correct with one instance and one Puma process. Counts reset on each
  deploy (accepted); more instances would need a shared store (a new ADR).
- **Rails serves the shell's static files.** Fine at portfolio traffic with long-lived caching;
  the provider's included bandwidth is the main overage risk (monitored monthly).
- **The provider is a data processor** for contact messages during Stage A: the privacy note is
  reviewed against the real host, region, logs and backups before going public (4.8).
- **Retention vs a three-month deployment:** no message can reach 12 months during a three-month
  Stage A, so a scheduled purge would delete nothing unless Stage A is extended. Step 4.7 decides
  between a scheduled job (about $1/month at research time) and a documented manual procedure;
  either way it is verified before going public, and the privacy note never claims automatic
  deletion that isn't running.
- **Vendor lock-in is small:** `render.yaml` is the only provider-specific file; the image runs
  anywhere. Changing host is a new ADR.
- **Stage B costs only the domain renewal**; the full-stack implementation remains in the
  repository, built and tested in CI.

### Production prerequisites (summary)

HSTS for the first deployment is one day without `includeSubDomains` or `preload` (Step 4.3,
owner's decision), revisited before the public go-live (Step 4.9) once the domain and its
subdomains are known.

The checklist, with the step that delivers each item, lives in `docs/ROADMAP.md` ("Phase 4
prerequisites"): secrets only in the provider's environment; `config.hosts`; `trusted_proxies`
for the verified proxy hop; security headers and a CSP in both stages; request logs without
client IPs; managed backups, point-in-time recovery and a restore drill; a verified retention
procedure; the monthly operational review (messages read in a private provider shell with
`bin/rails contact_messages:list`, never copied elsewhere); cost controls (budget, billing
alerts if available, one instance, spending log); the privacy review.

### To verify before provisioning (Step 4.5)

Open items, not claims: the provider's proxy chain (what `REMOTE_ADDR` and `X-Forwarded-For`
look like to Rails) and the `TRUSTED_PROXIES` value that makes `client_ip` correct (**mandatory
gate before going public, verified on the provisioned service in Step 4.6**; Rails' default
private-network trust is not assumed safe); how health checks gate deploys and whether failing
checks restart the service; current prices and taxes; billing alerts, spend limits and how to cancel
and delete every resource; the "deploy only after checks pass" option; deploy rollback; the
`X-Forwarded-For` format and the proxy's address ranges; backup, point-in-time recovery and
restore behaviour on the chosen plan; whether scheduled jobs reach the private database; the
region list; PostgreSQL 18 availability on the chosen plan; Cloudflare Pages bandwidth terms and
custom-domain switching.
