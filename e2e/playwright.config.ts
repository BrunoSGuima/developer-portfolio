import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the full stack (ADR-0009): the shell's production build served by
 * `vite preview` (which falls back to index.html for every route, like the production host
 * must), proxying /api same-origin to the Rails API running in its e2e environment on its own
 * database (services/api/bin/e2e-server). Two projects: desktop (with real scrollbars, as on a
 * desktop browser) and mobile (touch, small viewport). Reduced motion is on by default for
 * determinism; the transition and mascot specs turn it off where they test motion.
 *
 * Servers are never reused: a busy port fails the run instead of silently testing (and writing
 * to) some other server, such as a development API.
 */
const PORT = 4173;
const API_PORT = 3100;
const CI = Boolean(process.env.CI);

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
  webServer: [
    {
      // Prepares and resets the e2e database, then serves on the loopback interface.
      command: 'bin/e2e-server',
      cwd: '../services/api',
      env: { PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/up`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `npm run build -w apps/shell && npm run preview -w apps/shell -- --port ${PORT} --strictPort`,
      cwd: '..',
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
