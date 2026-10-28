# Cloudflare Pages (the production site)

The portfolio's public home (ADR-0016): the **static** build (`VITE_APP_MODE=static`, local data,
no backend) on Cloudflare Pages Free, with a custom domain at publication. The full stack isn't
deployed; it runs locally. Prepared and tested in Phase 4, Step 4.4; **nothing is deployed yet**
(the real Pages verification is Step 4.11, with the owner's approval).

## Files

| File              | Purpose                                                                                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_headers`        | The security headers and the enforced CSP (the same as the full-stack image's `SecurityHeaders`; `services/api/spec/deploy/static_headers_parity_spec.rb` fails if they drift), immutable caching for `/assets/*`, no CSP on the résumé PDF. |
| `assets/404.html` | A real 404 for missing files under `/assets/`, while every page URL keeps the SPA fallback (there is deliberately **no top-level `404.html`**: it would switch Pages' SPA mode off).                                                         |

They live here, not in `apps/shell/public/`, so the production image and `vite preview` never
serve them. `npm run build:pages` builds the static site and copies them into `apps/shell/dist`
(`scripts/prepare-pages.mjs`, which also refuses any build whose `build-mode.json` isn't
`static` and validates `_headers`).

## Pages project settings (to create in Step 4.11, with approval)

| Setting                | Value                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root directory         | the repository root                                                                                                                                           |
| Build command          | `npm ci --ignore-scripts && npm run build:pages`                                                                                                              |
| Build output directory | `apps/shell/dist`                                                                                                                                             |
| Environment variables  | `SKIP_DEPENDENCY_INSTALL=1` (the build command installs, lockfile-exact, without install scripts), `VITE_APP_MODE=static` (explicit, though it's the default) |
| Node.js                | from `.nvmrc` (`22`; Pages' v3 build image defaults to Node 22 as well)                                                                                       |
| Production branch      | `main`                                                                                                                                                        |
| Preview deployments    | **off**: branch control "None" (previews are public and on by default; no unreviewed changes published)                                                       |

No secrets, no API, no database. The build command was reproduced on a clean copy of the
repository (Step 4.4).

## Locally and in CI

```bash
npm run pages:emulator:install   # once: wrangler, isolated in tools/pages-emulator (own lockfile)
npm run test:e2e:static          # the static suite, served as Pages would (build:pages + emulator)
E2E_STATIC_SERVER=preview npm run test:e2e:static   # the same suite on vite preview (no emulator)
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
| Headers added or changed at Cloudflare's edge (e.g. dashboard HSTS) | Not emulated                                        | To check                   |

## Remaining before publication

1. **Step 4.11:**
   - create the Pages project with the settings above (owner's account and approval; Git
     integration limited to this repository, since a Direct Upload project can never switch to
     Git)
   - deploy `main` to its `*.pages.dev` URL
   - keep `*.pages.dev` out of search engines with the documented absolute-URL rule
     (`X-Robots-Tag: noindex`)
   - check Pages' default `Access-Control-Allow-Origin: *` against the parity rule
   - confirm every "To confirm" row with the static E2E suite and the browser smoke
     (`SMOKE_BASE_URL=https://<project>.pages.dev`)
2. **Step 4.12:**
   - add the custom domain
   - revisit HSTS (one day, no `includeSubDomains`) for it
   - run the checks against it
