/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
