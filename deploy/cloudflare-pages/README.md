# Cloudflare Pages (the production site)

The portfolio's public home (ADR-0016): the **static** build (`VITE_APP_MODE=static`, local data,
no backend) on Cloudflare Pages Free, with a custom domain at publication. The full stack isn't
deployed; it runs locally. Prepared and tested in Phase 4, Step 4.4; **nothing is deployed yet**
(Step 4.11: the owner creates the project on `*.pages.dev`; the custom domain is Step 4.12).

## Files

| File              | Purpose                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_headers`        | The security headers and the enforced CSP (the same as the full-stack image's `SecurityHeaders`; `services/api/spec/deploy/static_headers_parity_spec.rb` fails if they drift), immutable caching for `/assets/*`, no CSP on the résumé PDFs, and `X-Robots-Tag: noindex` on every `*.pages.dev` address (below). |
| `assets/404.html` | A real 404 for missing files under `/assets/`, while every page URL keeps the SPA fallback (there is deliberately **no top-level `404.html`**: it would switch Pages' SPA mode off).                                                                                                                              |

They live here, not in `apps/shell/public/`, so the production image and `vite preview` never
serve them. `npm run build:pages` builds the static site and copies them into `apps/shell/dist`
(`scripts/prepare-pages.mjs`, which also refuses any build whose `build-mode.json` isn't
`static` and validates `_headers`).

## Pages project settings (Step 4.11; the owner creates the project)

Checked against Cloudflare's documentation on 2026-10-29, and the build command reproduced on a
clean clone (Step 4.11).

| Setting                | Value                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| How                    | **Connect to Git** (a Direct Upload project can never switch to Git later)                                                              |
| Repository access      | the GitHub app limited to **this repository only** ("Only select repositories")                                                         |
| Framework preset       | None                                                                                                                                    |
| Root directory         | empty (the repository root: the npm workspaces need the root lockfile)                                                                  |
| Build command          | `npm ci --ignore-scripts && npm run build:pages`                                                                                        |
| Build output directory | `apps/shell/dist`                                                                                                                       |
| Environment variables  | `SKIP_DEPENDENCY_INSTALL=1` (the build command installs, lockfile-exact, without install scripts), `VITE_APP_MODE=static` (explicit)    |
| Node.js                | from `.nvmrc` (`22`). Build image v3 honours `.nvmrc` (its default is Node 22 as well) but not `package.json` `engines`                 |
| Production branch      | `main` (automatic deployments on)                                                                                                       |
| Preview deployments    | **off**: Settings → Builds → Branch control → Preview branch **None** (previews are public and on by default)                           |
| Leave off              | Web Analytics (its injected script would break the CSP), the Access policy, Functions, bindings, custom domains (Step 4.12), paid plans |

No secrets, no API, no database. A successful build log ends with
`prepare-pages: … is a static build, ready for Cloudflare Pages.`

**Known and accepted (owner, Step 4.11):**

- the `*.pages.dev` address is public, but never indexed
- Pages builds every push to `main` without waiting for GitHub Actions

### Search engines

Pages adds `X-Robots-Tag: noindex` to preview deployments only. `_headers` therefore adds it to
`https://:project.pages.dev/*` (production) and `https://:version.:project.pages.dev/*` (each
deployment's `<hash>.<project>.pages.dev` and branch aliases): Cloudflare's documented rules, in
which a host placeholder matches one label. Verified under the emulator by Host header (also
`static-host.spec.ts`): noindex on those hosts, none on `localhost`, a custom domain or
`<project>.pages.dev.example.com`. The custom domain stays indexable; `robots.txt` allows crawling
so crawlers can see the header. If real Pages ignored the rules, the fallback is a one-file Pages
Function that adds the header on `*.pages.dev`.

## Locally and in CI

```bash
npm run pages:emulator:install   # once: wrangler, isolated in tools/pages-emulator (own lockfile)
npm run test:e2e:static          # the static suite, served as Pages would (build:pages + emulator)
E2E_STATIC_SERVER=preview npm run test:e2e:static   # the same suite on vite preview (no emulator)

# A deployed site (Step 4.11): starts nothing, read-only (the static site has no form)
E2E_MODE=static E2E_STATIC_SERVER=remote E2E_BASE_URL=https://<project>.pages.dev npm run e2e -w e2e
SMOKE_BASE_URL=https://<project>.pages.dev npx playwright test -c e2e/playwright.smoke.config.ts
```

The emulator is `wrangler pages dev` (no Cloudflare account, metrics off); it is a development
and CI tool only, never part of the shell or the production image. CI's `e2e-static` job runs the
whole static suite under it, including `e2e/tests/static-host.spec.ts`.

## What the emulator showed (Step 4.4) and what Pages must confirm (Step 4.11)

| Behaviour                                                           | Emulator (`wrangler pages dev` 4.154.0)             | Real Pages                 |
| ------------------------------------------------------------------- | --------------------------------------------------- | -------------------------- |
| `_headers` on documents, assets, the SPA fallback                   | Applied as written                                  | To confirm                 |
| CSP removed from the PDF (`! Content-Security-Policy`)              | Removed; `application/pdf`                          | To confirm                 |
| `/assets/*` cache                                                   | `public, max-age=31536000, immutable`               | To confirm                 |
| Other files' cache                                                  | Pages' default `public, max-age=0, must-revalidate` | Documented default         |
| Every route, `/pt-br`, `/pt-br/`, trailing slashes                  | 200, the shell (no redirect)                        | To confirm                 |
| Unknown page                                                        | 200, the shell's 404 page                           | Documented (SPA mode)      |
| Missing asset with `assets/404.html`                                | 404, the small page, `no-store`                     | To confirm                 |
| Missing asset without it                                            | 200 `index.html` with the immutable cache (avoided) | —                          |
| `/index.html`                                                       | 308 to `/`                                          | Documented                 |
| `/_headers`                                                         | Not served (502 in the emulator)                    | To confirm it isn't served |
| `X-Robots-Tag: noindex` on `*.pages.dev` hosts only                 | As written (by Host header)                         | To confirm                 |
| Pages' own default headers (e.g. `Access-Control-Allow-Origin`)     | Not emulated                                        | To check                   |
| Headers added or changed at Cloudflare's edge (e.g. dashboard HSTS) | Not emulated                                        | To check                   |

## Remaining before publication

1. **Step 4.11:**
   - done in the repository: the noindex rules, the remote mode, the settings above
   - the owner: create the Pages project with the settings above and deploy `main` to its
     `*.pages.dev` URL
   - then: the remote suite, the browser smoke and `curl -sI` against it (also a
     `<hash>.<project>.pages.dev` URL), filling in the "Real Pages" column
   - decide on Pages' default `Access-Control-Allow-Origin: *`, if present (recommended: accept
     and document it; the site is public, static and has no credentials, and
     `Cross-Origin-Resource-Policy: same-origin` still applies)
2. **Step 4.12:**
   - add the custom domain
   - revisit HSTS (one day, no `includeSubDomains`) for it
   - run the checks against it
