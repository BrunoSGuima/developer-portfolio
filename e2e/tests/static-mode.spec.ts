import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { e2eMode, remoteBaseURL } from '../support/mode.ts';
import { pages } from '../support/site.ts';

// The static build (ADR-0014) works with no Rails API and no database: it never requests /api
// and doesn't even contain the API client.

/** The local build's scripts: every file in apps/shell/dist/assets. */
function localScripts(): Map<string, string> {
  const assets = fileURLToPath(new URL('../../apps/shell/dist/assets/', import.meta.url));
  return new Map(
    readdirSync(assets)
      .filter((file) => file.endsWith('.js'))
      .map((file) => [file, readFileSync(assets + file, 'utf8')]),
  );
}

/**
 * A deployed site's scripts (remote runs, Step 4.11): the entry script in index.html, then every
 * chunk the scripts name, transitively (Vite names each chunk `<name>-<8-char hash>.js`).
 */
async function deployedScripts(request: APIRequestContext): Promise<Map<string, string>> {
  const chunk = /[\w.-]+-[\w-]{8}\.js/g;
  const scripts = new Map<string, string>();
  const queue = [...(await (await request.get('/')).text()).matchAll(chunk)].map(([name]) => name);
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    if (scripts.has(name)) continue;
    const response = await request.get(`/assets/${name}`);
    expect(response.status(), name).toBe(200);
    const code = await response.text();
    scripts.set(name, code);
    queue.push(...[...code.matchAll(chunk)].map(([found]) => found));
  }
  return scripts;
}
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

  test('contains no API client or contact form code', async ({ request }) => {
    // A remote run checks the deployed site's scripts, never the local build.
    const scripts = remoteBaseURL ? await deployedScripts(request) : localScripts();

    // The entry and every page's chunk, at least.
    expect(scripts.size).toBeGreaterThan(5);
    for (const [file, code] of scripts) {
      expect(code, file).not.toContain('/api/v1');
      expect(code, file).not.toContain('contact_messages');
      // The contact form (data-contact-form) is full-stack only, like its client.
      expect(code, file).not.toContain('data-contact-form');
    }
  });
});
