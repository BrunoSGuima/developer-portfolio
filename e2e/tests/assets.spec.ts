import { expect, test } from '@playwright/test';
import { about } from '../../apps/shell/src/content/profile.ts';
import { open } from '../support/shell.ts';
import { LOCALES, pageOf } from '../support/site.ts';

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

  for (const locale of LOCALES) {
    test(`the résumé link downloads the ${locale} PDF`, async ({ page, request }) => {
      await open(page, pageOf('about', locale).path);
      const href = await page.locator('main a[download]').getAttribute('href');

      expect(href).toBe(about.resume.href[locale]);
      const response = await request.get(href!);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/pdf');
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    });
  }
});
