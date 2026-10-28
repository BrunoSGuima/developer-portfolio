import type { AppMode } from '../../apps/shell/src/config/mode.ts';

/**
 * The mode of the site under test (ADR-0014): `npm run test:e2e` tests the full-stack build
 * against the e2e API; `npm run test:e2e:static` (E2E_MODE=static) tests the static build with no
 * API at all. playwright.config.ts builds and serves accordingly.
 */
function readMode(value: string | undefined): AppMode {
  if (value === undefined || value === '' || value === 'fullstack') return 'fullstack';
  if (value === 'static') return 'static';
  throw new Error(`E2E_MODE must be "fullstack" or "static" (got "${value}").`);
}

export const e2eMode: AppMode = readMode(process.env['E2E_MODE']);

/**
 * How a static run is served (Phase 4 Step 4.4): `pages` (the default) runs the Pages build under
 * the Cloudflare Pages emulator, so the static site's hosting rules (_headers, SPA fallback) are
 * tested too; `preview` serves the plain static build with vite preview (quicker, no emulator).
 */
function readStaticServer(value: string | undefined): 'pages' | 'preview' {
  if (value === undefined || value === '' || value === 'pages') return 'pages';
  if (value === 'preview') return 'preview';
  throw new Error(`E2E_STATIC_SERVER must be "pages" or "preview" (got "${value}").`);
}

/** Whether this run serves the static site as Cloudflare Pages would (static-host.spec.ts). */
export const servedAsPages =
  e2eMode === 'static' && readStaticServer(process.env['E2E_STATIC_SERVER']) === 'pages';
