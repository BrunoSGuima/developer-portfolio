import { expect, test } from '@playwright/test';
import { open } from '../support/shell.ts';
import { pageOf } from '../support/site.ts';

test.describe('static files', () => {
  test('favicons, the touch icon and robots.txt are served', async ({ request }) => {
    for (const [path, type] of [
      ['/favicon-16.png', 'image/png'],
      ['/favicon-32.png', 'image/png'],
      ['/apple-touch-icon.png', 'image/png'],
      ['/robots.txt', 'text/plain'],
    ]) {
      const response = await request.get(path!);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type'], path).toContain(type);
    }
  });

  test('the résumé link downloads the public PDF', async ({ page, request }) => {
    await open(page, pageOf('about', 'en').path);
    const href = await page.locator('main a[download]').getAttribute('href');

    expect(href).toMatch(/\.pdf$/);
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });
});
