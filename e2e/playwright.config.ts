import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the production build (ADR-0009): the web server builds the shell and
 * serves it with `vite preview`, which falls back to index.html for every route (like the
 * production host must). Two projects: desktop (with real scrollbars, as on a desktop
 * browser) and mobile (touch, small viewport). Reduced motion is on by default for
 * determinism; the transition and mascot specs turn it off where they test motion.
 */
const PORT = 4173;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  ...(CI ? { workers: 1 } : {}),
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
  webServer: {
    command: `npm run build -w apps/shell && npm run preview -w apps/shell -- --port ${PORT} --strictPort`,
    cwd: '..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
