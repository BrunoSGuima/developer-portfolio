import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';

/**
 * The e2e API's rate-limit counters live in files at this fixed path (config/environments/e2e.rb,
 * the only environment with a file store). Deleting them resets every client's counts; the next
 * request recreates the directory.
 */
const STORE = fileURLToPath(new URL('../../services/api/tmp/e2e/rate-limits', import.meta.url));

/**
 * Resets the e2e API's rate limits. Safe only when no request to a rate-limited endpoint is in
 * flight, so it may only be called from specs that are the sole users of those endpoints and
 * run serially on the desktop project (`test.describe.configure({ mode: 'serial' })`); other
 * specs stub those endpoints with page.route instead.
 */
export function resetRateLimits() {
  if (test.info().project.name !== 'desktop') {
    throw new Error('resetRateLimits() runs on the desktop project only (serial real-API specs).');
  }
  if (!STORE.endsWith('/services/api/tmp/e2e/rate-limits')) {
    throw new Error(`Refusing to delete an unexpected path: ${STORE}`);
  }
  rmSync(STORE, { recursive: true, force: true });
}
