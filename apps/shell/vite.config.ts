/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

/**
 * The Rails API is served same-origin under /api (ADR-0011): the dev server and `vite preview`
 * forward /api requests to it unchanged (path, method, body, headers and the response), so the
 * browser never makes a cross-origin request and no CORS is configured. The target is read here
 * only (not a VITE_ variable, so it never reaches the bundle); the end-to-end suite points it at
 * the e2e API server.
 */
export const apiProxy: Record<string, ProxyOptions> = {
  '/api': { target: process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:3000' },
};

/**
 * The build's mode (src/config/mode.ts): unset means 'static'; anything other than 'static' or
 * 'fullstack' fails the build or dev server, so a typo can never silently produce a static site.
 */
export function checkAppMode(env: Record<string, string>): 'static' | 'fullstack' {
  const value = env['VITE_APP_MODE'];
  if (value === undefined || value === '' || value === 'static') return 'static';
  if (value === 'fullstack') return 'fullstack';
  throw new Error(`VITE_APP_MODE must be "static" or "fullstack" (got "${value}").`);
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const appMode = checkAppMode({
    ...loadEnv(mode, process.cwd(), 'VITE_'),
    ...process.env,
  } as Record<string, string>);
  if (mode !== 'test') console.info(`Shell mode: ${appMode} (VITE_APP_MODE).`);

  return {
    plugins: [react()],
    // Builds get the validated mode as a literal (src/config/mode.ts), so a static build drops
    // every full-stack-only branch, including the API client. The dev server and tests keep it
    // a normal env value (tests switch it with vi.stubEnv).
    ...(command === 'build'
      ? { define: { 'import.meta.env.VITE_APP_MODE': JSON.stringify(appMode) } }
      : {}),
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});
