import { defineConfig, devices } from '@playwright/test';
import { e2eMode, servedAsPages } from './support/mode.ts';

/**
 * End-to-end tests against the full stack (ADR-0009): the shell's production build served by
 * `vite preview` (which falls back to index.html for every route, like the production host
 * must), proxying /api same-origin to the Rails API running in its e2e environment on its own
 * database (services/api/bin/e2e-server). Two projects: desktop (with real scrollbars, as on a
 * desktop browser) and mobile (touch, small viewport). Reduced motion is on by default for
 * determinism; the transition and mascot specs turn it off where they test motion.
 *
 * The suite runs in either mode of the site (support/mode.ts): full-stack (`npm run test:e2e`,
 * both servers) or static (`npm run test:e2e:static`, the static build alone, no API).
 *
 * Servers are never reused: a busy port fails the run instead of silently testing (and writing
 * to) some other server, such as a development API.
 */
const PORT = 4173;
const API_PORT = 3100;
const CI = Boolean(process.env.CI);
const MODE = e2eMode;

// The e2e API (full-stack runs only): prepares and resets the e2e database, then serves on the
// loopback interface.
const apiServer = {
  command: 'bin/e2e-server',
  cwd: '../services/api',
  env: { PORT: String(API_PORT) },
  url: `http://127.0.0.1:${API_PORT}/up`,
  reuseExistingServer: false,
  timeout: 180_000,
};

// The shell's production build in the mode under test. A static run proxies /api nowhere (a
// closed port), so any request a static build made would fail; the specs assert there are none.
const previewServer = {
  command: `npm run ${MODE === 'fullstack' ? 'build:fullstack' : 'build'} -w apps/shell && npm run preview -w apps/shell -- --port ${PORT} --strictPort`,
  cwd: '..',
  env: {
    API_PROXY_TARGET: MODE === 'fullstack' ? `http://127.0.0.1:${API_PORT}` : 'http://127.0.0.1:9',
  },
  url: `http://localhost:${PORT}`,
  reuseExistingServer: false,
  timeout: 180_000,
};

// Static runs are served as Cloudflare Pages would serve them (Stage B, ADR-0015): the Pages
// build (`npm run build:pages`: the static build plus deploy/cloudflare-pages) under the
// emulator (`wrangler pages dev`, tools/pages-emulator; install it once with
// `npm run pages:emulator:install`), so its _headers rules and SPA fallback apply.
// E2E_STATIC_SERVER=preview serves the plain static build with vite preview instead.
const pagesServer = {
  command: `npm run build:pages && tools/pages-emulator/node_modules/.bin/wrangler pages dev apps/shell/dist --ip localhost --port ${PORT} --compatibility-date 2026-10-01`,
  cwd: '..',
  env: { WRANGLER_SEND_METRICS: 'false' },
  url: `http://localhost:${PORT}`,
  reuseExistingServer: false,
  timeout: 180_000,
};

const shellServer = servedAsPages ? pagesServer : previewServer;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  // GitHub's Linux runners have 4 vCPUs; two workers keep CI fast without contention.
  ...(CI ? { workers: 2 } : {}),
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        // Headless Chromium hides scrollbars; the layout (Step 8) is tuned with real ones.
        launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
      },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: MODE === 'fullstack' ? [apiServer, shellServer] : [shellServer],
});
