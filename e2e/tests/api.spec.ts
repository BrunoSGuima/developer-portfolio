import { expect, test } from '@playwright/test';
import { e2eMode } from '../support/mode.ts';

// The real Rails API (e2e environment, seeded database) through the shell's same-origin /api
// proxy (Step 3.1). Read-only, so it runs in parallel on both projects.
test.skip(e2eMode !== 'fullstack', 'The API exists only in full-stack runs.');

test.describe('the API through the /api proxy', () => {
  test('serves the seeded projects as JSON, in both languages', async ({ request }) => {
    const response = await request.get('/api/v1/projects');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/json; charset=utf-8');
    const { data } = (await response.json()) as {
      data: { slug: string; name: Record<string, string>; links: { url: string }[] }[];
    };
    const project = data.find((item) => item.slug === 'developer-portfolio');
    expect(project?.name).toEqual({
      en: 'Developer Portfolio (this site)',
      'pt-BR': 'Portfólio de Desenvolvedor (este site)',
    });
    expect(project?.links.map((link) => link.url)).toEqual(['https://github.com/BrunoSGuima']);
  });

  test('is same-origin for the page: a plain fetch works without CORS', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/projects');
      return { status: response.status, type: response.type, url: response.url };
    });

    expect(result.status).toBe(200);
    expect(result.type).toBe('basic');
    expect(new URL(result.url).origin).toBe(new URL(page.url()).origin);
  });

  test('passes the API error envelope through unchanged (404)', async ({ request }) => {
    const response = await request.get('/api/v1/projects/does-not-exist');

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'Project not found', details: {} },
    });
  });

  test('passes 405 and its Allow header through unchanged', async ({ request }) => {
    const response = await request.post('/api/v1/projects', { data: {} });

    expect(response.status()).toBe(405);
    expect(response.headers()['allow']).toBe('GET, HEAD');
    expect((await response.json()) as unknown).toMatchObject({
      error: { code: 'method_not_allowed' },
    });
  });
});
