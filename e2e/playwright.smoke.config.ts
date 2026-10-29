import { defineConfig, devices } from '@playwright/test';

/**
 * The browser smoke test (Phase 4): a few read-only checks of an already-running site, built to
 * run against the production image in CI (scripts/smoke-image.sh) and later against the static
 * site on Cloudflare Pages (Steps 4.11 and 4.12; ADR-0016). It starts no server and writes nothing: it
 * never submits the contact form.
 *
 *   SMOKE_BASE_URL=http://127.0.0.1:3999 npx playwright test -c e2e/playwright.smoke.config.ts
 */
const baseURL = process.env['SMOKE_BASE_URL'];
if (!baseURL) throw new Error('Set SMOKE_BASE_URL to the site under test.');

export default defineConfig({
  testDir: './smoke',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: { baseURL, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
