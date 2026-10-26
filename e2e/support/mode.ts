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
