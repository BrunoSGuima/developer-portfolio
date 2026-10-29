# Cloudflare Pages (the production site)

The portfolio's public home (ADR-0016): the **static** build (`VITE_APP_MODE=static`, local data,
no backend) on Cloudflare Pages Free, with a custom domain at publication. The full stack isn't
deployed; it runs locally. Prepared and tested in Phase 4, Step 4.4.

**Deployed (Step 4.11, 2026-10-29):** the owner's Pages project `bruno-guimaraes`, at
**https://bruno-guimaraes.pages.dev/**, built from `main` (first deployment: `ab12700`, also at
`https://a3611000.bruno-guimaraes.pages.dev`). It's public but never indexed (`X-Robots-Tag:
noindex`); the custom domain, the site's public address, is Step 4.12.

## Files

| File              | Purpose                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_headers`        | The security headers and the enforced CSP (the same as the full-stack image's `SecurityHeaders`; `services/api/spec/deploy/static_headers_parity_spec.rb` fails if they drift), immutable caching for `/assets/*`, no CSP on the résumé PDFs, and `X-Robots-Tag: noindex` on every `*.pages.dev` address (below). |
| `assets/404.html` | A real 404 for missing files under `/assets/`, while every page URL keeps the SPA fallback (there is deliberately **no top-level `404.html`**: it would switch Pages' SPA mode off).                                                                                                                              |

They live here, not in `apps/shell/public/`, so the production image and `vite preview` never
serve them. `npm run build:pages` builds the static site and copies them into `apps/shell/dist`
(`scripts/prepare-pages.mjs`, which also refuses any build whose `build-mode.json` isn't
`static` and validates `_headers`).

## Pages project settings (Step 4.11; the owner's project, as configured)

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

**Confirmed by the owner (Step 4.11, 2026-10-29):**

- the Cloudflare GitHub app has access to `BrunoSGuima/developer-portfolio` only ("Only select
  repositories")
- the project is on the Free plan, with no paid add-on

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

## What the emulator showed (Step 4.4) and what real Pages does (Step 4.11)

Real Pages: `https://bruno-guimaraes.pages.dev` and its deployment URL, 2026-10-29 (`curl`, the
remote static suite and the browser smoke).

| Behaviour                                                 | Emulator (`wrangler pages dev` 4.154.0)             | Real Pages (Step 4.11)                                             |
| --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| `_headers` on documents, assets, the SPA fallback         | Applied as written                                  | Applied as written                                                 |
| CSP removed from the PDFs (`! Content-Security-Policy`)   | Removed; `application/pdf`                          | Removed; `application/pdf`                                         |
| `/assets/*` cache                                         | `public, max-age=31536000, immutable`               | The same                                                           |
| Other files' cache                                        | Pages' default `public, max-age=0, must-revalidate` | The same                                                           |
| Every route, `/pt-br`, `/pt-br/`, trailing slashes        | 200, the shell (no redirect)                        | 200, the shell (no redirect)                                       |
| Unknown page                                              | 200, the shell's 404 page                           | 200, the shell's 404 page                                          |
| Missing asset with `assets/404.html`                      | 404, the small page, `no-store`                     | 404, `no-store`                                                    |
| Missing asset without it                                  | 200 `index.html` with the immutable cache (avoided) | —                                                                  |
| `/index.html`                                             | 308 to `/`                                          | 308 to `/`                                                         |
| `/_headers`                                               | Not served (502 in the emulator)                    | Not served: the SPA fallback (`index.html`)                        |
| `X-Robots-Tag: noindex` on `*.pages.dev` hosts only       | As written (by Host header)                         | On the production and the deployment URL (documents, assets, PDFs) |
| HTTP                                                      | —                                                   | 301 to HTTPS (both URLs)                                           |
| Pages' own default headers                                | Not emulated                                        | `Access-Control-Allow-Origin: *`; Cloudflare's `report-to` / `nel` |
| Headers added or changed at Cloudflare's edge (e.g. HSTS) | Not emulated                                        | None changed: HSTS is `_headers`' one day                          |

**`Access-Control-Allow-Origin: *` (accepted, Step 4.11):** Pages adds it to every response. It
only lets other sites' scripts read this site's public, static, credential-free files, which
anyone can fetch anyway; `Cross-Origin-Resource-Policy: same-origin` still applies, and the
parity rule covers the headers this project sets. Removing it (`! Access-Control-Allow-Origin`)
would be a new decision with a parity note. `report-to` / `nel` are Cloudflare's network-error
reporting (`success_fraction` 0), not page content.

## Remaining before publication

1. **Step 4.11:** done: deployed, validated and the owner's settings confirmed (above;
   `docs/ROADMAP.md`, Step 4.11).
2. **Step 4.12:**
   - add the custom domain
   - revisit HSTS (one day, no `includeSubDomains`) for it
   - run the checks against it
