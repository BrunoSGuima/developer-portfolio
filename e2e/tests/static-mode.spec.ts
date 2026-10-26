import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { e2eMode } from '../support/mode.ts';
import { pages } from '../support/site.ts';

// The static build (ADR-0014) works with no Rails API and no database: it never requests /api
// and doesn't even contain the API client.
test.describe('the static build', () => {
  test.skip(e2eMode !== 'static', 'Only the static build is checked here.');

  test('makes no /api request on any page, in any language', async ({ page }) => {
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api')) apiRequests.push(request.url());
    });

    for (const { path, heading } of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }

    expect(apiRequests).toEqual([]);
  });

  test('contains no API client code', () => {
    const assets = fileURLToPath(new URL('../../apps/shell/dist/assets/', import.meta.url));
    const scripts = readdirSync(assets).filter((file) => file.endsWith('.js'));

    expect(scripts.length).toBeGreaterThan(0);
    for (const file of scripts) {
      expect(readFileSync(assets + file, 'utf8'), file).not.toContain('/api/v1');
    }
  });
});
