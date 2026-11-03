import { defineConfig, devices } from '@playwright/test';

/**
 * The 3D mascot's test build, on its own (`npm run test:e2e:mascot3d`): a separate
 * build in apps/shell/.mascot3d-dist (never apps/shell/dist), served under the Pages emulator with
 * the site's real headers, so its CSP applies. Headless browsers have only
 * a software renderer, which the app normally refuses: this build alone allows it.
 */
const PORT = 4174;
const DIST = 'apps/shell/.mascot3d-dist';

const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests-mascot3d',
  forbidOnly: CI,
  // One retry on CI's slower machines. The report still names any flaky test: it is not hidden.
  retries: CI ? 1 : 0,
  fullyParallel: true,
  workers: 2,
  reporter: CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list']],
  outputDir: 'test-results/mascot3d',
  expect: { timeout: 10_000 },
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: 'no-preference',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: [
      `VITE_MASCOT_3D=1 VITE_MASCOT_3D_ALLOW_SOFTWARE=1 npm run build -w apps/shell -- --outDir .mascot3d-dist --emptyOutDir`,
      `cp -r deploy/cloudflare-pages/. ${DIST}/`,
      `tools/pages-emulator/node_modules/.bin/wrangler pages dev ${DIST} --ip localhost --port ${PORT} --compatibility-date 2026-10-01`,
    ].join(' && '),
    cwd: '..',
    env: { WRANGLER_SEND_METRICS: 'false' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
