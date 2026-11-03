/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite';

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

/**
 * Whether the build includes the 3D mascot (src/app/RootLayout.tsx, ADR-0018). Only the Cloudflare
 * Pages build sets it. Anything but unset or "1" fails, so a typo can't silently build the wrong site.
 */
export function checkMascot3d(env: Record<string, string>): boolean {
  const value = env['VITE_MASCOT_3D'];
  if (value === undefined || value === '') return false;
  if (value === '1') return true;
  throw new Error(`VITE_MASCOT_3D must be "1" or unset (got "${value}").`);
}

/**
 * Whether this is the 3D mascot's test build: it accepts software renderers and test characters,
 * so it must never be published. A normal value check, like the flags above.
 */
export function checkMascot3dTestBuild(env: Record<string, string>): boolean {
  const value = env['VITE_MASCOT_3D_ALLOW_SOFTWARE'];
  if (value === undefined || value === '') return false;
  if (value === '1') return true;
  throw new Error(`VITE_MASCOT_3D_ALLOW_SOFTWARE must be "1" or unset (got "${value}").`);
}

/**
 * Records the build's mode in the build itself (`dist/build-mode.json`, Step 4.4), so deploy
 * scripts check it explicitly instead of inferring it from the bundle: the Cloudflare Pages
 * preparation (scripts/prepare-pages.mjs) accepts only a static build, and never a test build.
 */
export function buildModeFile(
  appMode: 'static' | 'fullstack',
  mascot3d = false,
  mascot3dTestBuild = false,
): Plugin {
  return {
    name: 'portfolio-build-mode',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-mode.json',
        source: `${JSON.stringify({
          mode: appMode,
          ...(mascot3d ? { mascot3d } : {}),
          ...(mascot3dTestBuild ? { mascot3dTestBuild } : {}),
        })}\n`,
      });
    },
  };
}

// https://vite.dev/config/
/** Flagged builds only: a normal build's index.html, and so its output, stays exactly as it was. */
function mascot3dGate(flagged: boolean): Plugin {
  return {
    name: 'mascot3d-gate',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        flagged
          ? html.replace(
              '</head>',
              '<link rel="stylesheet" href="/src/mascot/three/gate.css" /></head>',
            )
          : html,
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env } as Record<
    string,
    string
  >;
  const appMode = checkAppMode(env);
  const mascot3d = checkMascot3d(env);
  const mascot3dTestBuild = checkMascot3dTestBuild(env);
  if (mode !== 'test') console.info(`Shell mode: ${appMode} (VITE_APP_MODE).`);

  return {
    plugins: [mascot3dGate(mascot3d), react(), buildModeFile(appMode, mascot3d, mascot3dTestBuild)],
    // Builds get the validated mode as a literal (src/config/mode.ts), so a static build drops
    // every full-stack-only branch, including the API client. The dev server and tests keep it
    // a normal env value (tests switch it with vi.stubEnv).
    ...(command === 'build'
      ? {
          define: {
            'import.meta.env.VITE_APP_MODE': JSON.stringify(appMode),
            'import.meta.env.VITE_MASCOT_3D': JSON.stringify(mascot3d ? '1' : ''),
          },
        }
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
