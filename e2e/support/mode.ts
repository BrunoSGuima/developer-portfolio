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
 * tested too; `preview` serves the plain static build with vite preview (quicker, no emulator);
 * `remote` (Step 4.11) starts nothing and tests a deployed site on Cloudflare Pages at
 * E2E_BASE_URL. The static site has no form, so a remote run only reads.
 */
type StaticServer = 'pages' | 'preview' | 'remote';

function readStaticServer(value: string | undefined): StaticServer {
  if (value === undefined || value === '' || value === 'pages') return 'pages';
  if (value === 'preview' || value === 'remote') return value;
  throw new Error(`E2E_STATIC_SERVER must be "pages", "preview" or "remote" (got "${value}").`);
}

const staticServer = readStaticServer(process.env['E2E_STATIC_SERVER']);
if (staticServer === 'remote' && e2eMode !== 'static') {
  throw new Error('E2E_STATIC_SERVER=remote tests a deployed static site: set E2E_MODE=static.');
}

/**
 * The deployed site a remote run tests: https, or http on this machine only (to try the mode
 * against a local server). Undefined unless E2E_STATIC_SERVER=remote.
 */
function readRemoteBaseURL(value: string | undefined): string | undefined {
  if (staticServer !== 'remote') return undefined;
  if (!value) throw new Error('E2E_STATIC_SERVER=remote needs E2E_BASE_URL (the deployed site).');
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error(`E2E_BASE_URL must be an https URL (got "${value}").`);
  }
  return url.origin;
}

export const remoteBaseURL = readRemoteBaseURL(process.env['E2E_BASE_URL']);

/**
 * Whether this run tests the static site as Cloudflare Pages serves it, under the emulator or
 * deployed (static-host.spec.ts).
 */
export const servedAsPages = e2eMode === 'static' && staticServer !== 'preview';
