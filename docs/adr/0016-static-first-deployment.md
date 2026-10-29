# ADR-0016: Static-first deployment on Cloudflare Pages

- **Status:** Accepted (Phase 4, Step 4.5; supersedes ADR-0015)
- **Date:** 2026-10-28

## Context

ADR-0015 planned two stages:

- **Stage A:** the full-stack build (React shell, Rails API, PostgreSQL) on Render for about three
  months.
- **Stage B:** the static build on Cloudflare Pages, permanently.

Steps 4.2–4.4 built and tested what both stages need: the production image, production
hardening, and a static site ready for Pages.

Before provisioning anything, Step 4.5 checked Render's official pricing and documentation
(render.com/pricing and render.com/docs, read 2026-10-28):

- **Cost:**
  - Hobby workspace: $0/month.
  - Starter web service (0.5 CPU, 512 MB): $7/month.
  - Basic-256mb PostgreSQL: $6/month (storage $0.30/GB; the pricing page also lists "1 GB SSD
    storage included").
  - Hobby bandwidth: 5 GB/month included, then $0.15/GB.
  - Cron jobs: at least $1/month each.
  - **Total:** about $13–15/month with a Brazilian card's IOF, or $40–45 for three months.
- **Billing:** no spend cap is documented; bandwidth overage is billed.
- **Operating work:**
  - the client-IP chain (Render documents no `X-Forwarded-For` format; forum answers
    contradict each other)
  - a database open to the internet by default (`0.0.0.0/0` allow list)
  - SSH requirements for Docker images
  - backups, a restore drill and the contact-message retention procedure
- **Personal data:** a public contact form makes the provider a data processor for real
  visitors' messages.

For a personal portfolio, that recurring cost and operating work isn't justified. The static
build already presents the same pages in both languages and needs no server.

## Decision

1. **The public site is the static build only** (`npm run build:pages`), on **Cloudflare Pages
   Free**, from the repository's `main` branch. Its custom domain is registered when the site is
   published (Step 4.12, the owner's approved purchase).
2. **Both build modes stay** (ADR-0014):
   - **static:** the production mode; local data, no API calls, no contact form.
   - **fullstack:** the local demonstration mode. The Rails API and PostgreSQL run on the
     developer's machine (`bin/rails server`, PostgreSQL in Docker Compose), or as the
     production image against a local PostgreSQL.
3. **Nothing working is removed.** These stay implemented, tested in CI and documented:
   - the Rails API and its RSpec suite, the OpenAPI contract and the generated types
   - the contact form and its privacy rules (ADR-0013)
   - the production `Dockerfile`, `ShellAssets`, `bin/release`, `ProductionSettings`,
     `SecurityHeaders` and `scripts/smoke-image.sh`
   - **all five CI jobs** (`quality`, `e2e`, `e2e-static`, `api`, `image`)
4. **The backend is never described as hosted.**
   - The README, the Architecture page and the Fun Facts distinguish what is implemented in the
     repository (both modes) from what runs in production (the static site, once published).
   - `content/architecture.test.ts` enforces it.
5. **One security policy for both modes.** `deploy/cloudflare-pages/_headers` keeps the same
   headers and CSP as `SecurityHeaders`, enforced by the parity spec. A future full-stack
   deployment would then start from the policy the public site already uses.
6. **Deploying the full stack later needs a new ADR and the owner's approval.** It also needs
   the checklist in `docs/ROADMAP.md` ("If the full stack is ever deployed"). Step 4.5's Render
   findings are recorded there so they aren't lost.

### Publication sequence (Phase 4)

These steps come before final publication, in this order:

1. Dark mode, with a nighttime city scene on Home (4.6)
2. The new projects (4.7)
3. The updated résumés (4.8)
4. A review of the public README (4.9)
5. A cleanup of outdated comments (4.10)

Then:

- **Real Pages verification (4.11):** the `*.pages.dev` site checked against what Step 4.4 only
  emulated.
- **Custom domain and publication (4.12).**

Details: `docs/ROADMAP.md`.

### Rollback

- **A bad deploy:** Pages keeps every deployment, so roll back to an earlier one in its dashboard,
  or `git revert` and push.
- **No data to lose:** the static site has no data or state.

## Alternatives considered

| Option                                                    | Why not                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-0015 as planned (Render for three months, then Pages) | About $40–45 plus the operating work above, for a temporary showcase of features that can be demonstrated locally and are proven by CI.               |
| Render's free tier                                        | Web services sleep after 15 idle minutes (about a minute to wake); free databases expire after 30 days and have no backups; not meant for production. |
| A cheaper VPS                                             | Cheaper compute, but OS patching, backups and monitoring become the owner's work (ADR-0015).                                                          |
| Removing the backend from the repository                  | Throws away working, tested functionality that demonstrates the Rails, PostgreSQL and integration work.                                               |

## Consequences

- **$0 recurring infrastructure.** The only cost is the domain (bought in 4.12, recorded in the
  spending log).
- **No production personal data.** The contact form exists only in full-stack builds, which
  aren't public. Visitors reach the owner by email, LinkedIn or GitHub. ADR-0013's rules still
  apply wherever the full stack runs.
- **Visitors see the static site.** The Rails and PostgreSQL work is shown through:
  - the repository, CI and the README's local instructions
  - the Architecture page's "Two ways to run it" section
  - the Fun Facts, which say the API runs locally
- **Production prerequisites shrink to the static site's:**
  - headers and CSP (done, 4.4)
  - previews off
  - `*.pages.dev` kept out of search engines
  - HSTS revisited for the domain (4.12)

  Stage A's (`TRUSTED_PROXIES`, backups, retention, a provider shell) move to the "if ever
  deployed" checklist.

- **Watch:**
  - Cloudflare puts new features into Workers static assets rather than Pages (Pages isn't
    deprecated). Moving would be a new ADR, and the static build would stay the same.
  - Pages adds `Access-Control-Allow-Origin: *` by default; checked against the parity rule in
    4.11.

## Update (2026-10-29, Steps 4.11–4.12)

The static site is published on Cloudflare Pages Free at https://bruno-guimaraes.pages.dev,
with `X-Robots-Tag: noindex` on every `*.pages.dev` address. The owner decided that a custom
domain, search indexing and social sharing metadata are optional improvements, not part of the
static release (v4): they're in the roadmap's optional backlog, so the domain purchase and the
HSTS revisit described above happen only if that item is taken up. The Rails API and PostgreSQL
remain local, as decided here.
