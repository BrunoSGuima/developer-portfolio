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

  test('has no contact form, only the channels', async ({ page }) => {
    for (const path of ['/contact', '/pt-br/contact']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: /linkedin\.com/ })).toBeVisible();
      await expect(page.locator('form')).toHaveCount(0);
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await expect(page.locator('[data-contact-form]')).toHaveCount(0);
    }
  });

  test('contains no API client or contact form code', () => {
    const assets = fileURLToPath(new URL('../../apps/shell/dist/assets/', import.meta.url));
    const scripts = readdirSync(assets).filter((file) => file.endsWith('.js'));

    expect(scripts.length).toBeGreaterThan(0);
    for (const file of scripts) {
      const code = readFileSync(assets + file, 'utf8');
      expect(code, file).not.toContain('/api/v1');
      expect(code, file).not.toContain('contact_messages');
      // The contact form (data-contact-form) is full-stack only, like its client.
      expect(code, file).not.toContain('data-contact-form');
    }
  });
});
