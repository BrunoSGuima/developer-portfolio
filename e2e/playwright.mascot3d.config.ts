import { defineConfig, devices } from '@playwright/test';

/**
 * The flagged 3D mascot proof of concept, on its own (`npm run test:e2e:mascot3d`): a separate
 * build in apps/shell/.mascot3d-dist (never apps/shell/dist), served under the Pages emulator with
 * the site's real headers, so its CSP applies. It is not part of CI. Headless browsers have only
 * a software renderer, which the app normally refuses: this build alone allows it.
 */
const PORT = 4174;
const DIST = 'apps/shell/.mascot3d-dist';

export default defineConfig({
  testDir: './tests-mascot3d',
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
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
