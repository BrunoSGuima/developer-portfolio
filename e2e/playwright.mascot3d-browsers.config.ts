import { defineConfig, devices } from '@playwright/test';

/**
 * The flagged 3D mascot in other browser engines (`npm run test:e2e:mascot3d:browsers`): a smoke test
 * of the essentials, run locally, not in CI. Its build and server match playwright.mascot3d.config.ts.
 *
 * Playwright's WebKit is not Safari, and headless WebGL may be missing: each test states what it
 * could actually check, and the fallback must work either way.
 */
const PORT = 4176;
const DIST = 'apps/shell/.mascot3d-dist';

export default defineConfig({
  testDir: './tests-mascot3d-browsers',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/mascot3d-browsers',
  expect: { timeout: 15_000 },
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: 'no-preference',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: [
      `VITE_MASCOT_3D=1 VITE_MASCOT_3D_ALLOW_SOFTWARE=1 npm run build -w apps/shell -- --outDir .mascot3d-dist --emptyOutDir`,
      `cp -r deploy/cloudflare-pages/. ${DIST}/`,
      `tools/pages-emulator/node_modules/.bin/wrangler pages dev ${DIST} --ip localhost --port ${PORT} --inspector-port 9343 --compatibility-date 2026-10-01`,
    ].join(' && '),
    cwd: '..',
    env: { WRANGLER_SEND_METRICS: 'false' },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
