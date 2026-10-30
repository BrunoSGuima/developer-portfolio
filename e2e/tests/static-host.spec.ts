import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { about } from '../../apps/shell/src/content/profile.ts';
import { contact } from '../../apps/shell/src/content/contact.ts';
import { remoteBaseURL, servedAsPages } from '../support/mode.ts';
import { languageOf, notFoundCase, pages, type Locale } from '../support/site.ts';

// The static site as Cloudflare Pages serves it (the public site, ADR-0016, Phase 4 Step 4.4),
// under the Pages emulator (`wrangler pages dev`): the _headers rules, the SPA fallback for page
// URLs, real 404s for missing assets, and the static Contact page. It also runs against a
// deployed site (E2E_STATIC_SERVER=remote, Step 4.11), which confirms the emulator's results on
// the real platform (deploy/cloudflare-pages/README.md).
test.skip(!servedAsPages, 'Only when the static build is served as Cloudflare Pages would.');

// The expected headers come from the file the host applies; their parity with the full-stack
// image (Rails) is checked by services/api/spec/deploy/static_headers_parity_spec.rb.
const headersFile = readFileSync(
  fileURLToPath(new URL('../../deploy/cloudflare-pages/_headers', import.meta.url)),
  'utf8',
);

/** The headers a rule sets, by its path line (lower-case names). */
function rule(path: string): Record<string, string> {
  const lines = headersFile.split('\n');
  const start = lines.indexOf(path);
  const values: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const [name, ...rest] = line.trim().split(': ');
    values[name!.toLowerCase()] = rest.join(': ');
  }
  return values;
}

const site = rule('/*');

test.describe('the static site under the Cloudflare Pages emulator', () => {
  test.skip(({ isMobile }) => isMobile, 'Hosting behaviour is the same for every device.');

  test.describe('direct navigation (SPA fallback)', () => {
    for (const { path, heading, locale } of pages) {
      const variants = path === '/' ? ['/'] : [path, `${path}/`];
      for (const variant of variants) {
        test(`${variant} loads its page (${locale})`, async ({ page }) => {
          const response = await page.goto(variant);

          expect(response?.status()).toBe(200);
          await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute('lang', languageOf(locale).htmlLang);
        });
      }
    }

    for (const locale of ['en', 'pt-BR'] as Locale[]) {
      test(`an unknown page shows the shell's 404 page (${locale})`, async ({ page }) => {
        const unknown = notFoundCase(locale);

        const response = await page.goto(unknown.path);

        // Pages' SPA mode answers 200; the shell renders its own 404 page (as the image does).
        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1, name: unknown.heading })).toBeVisible();
      });
    }
  });

  test.describe('headers', () => {
    test('the document gets every _headers rule for /*, including the CSP and HSTS', async ({
      request,
    }) => {
      for (const path of ['/', '/pt-br/contact', '/does-not-exist']) {
        const headers = (await request.get(path)).headers();
        for (const [name, value] of Object.entries(site)) {
          expect(headers[name], `${path} ${name}`).toBe(value);
        }
      }
      expect(site['content-security-policy']).toContain("script-src 'self'");
      expect(site['strict-transport-security']).toBe('max-age=86400');
    });

    test('*.pages.dev addresses are never indexed; other hosts (the domain) are', async ({
      request,
    }) => {
      if (remoteBaseURL) {
        // A deployed site: its own address decides.
        const { hostname } = new URL(remoteBaseURL);
        const robots = (await request.get('/pt-br/about')).headers()['x-robots-tag'];
        expect(robots).toBe(hostname.endsWith('.pages.dev') ? 'noindex' : undefined);
        return;
      }
      // Under the emulator, the rules are matched against the Host header.
      const hosts = {
        'portfolio.pages.dev': 'noindex',
        'a1b2c3d4.portfolio.pages.dev': 'noindex',
        'main.portfolio.pages.dev': 'noindex',
        'example.com': undefined,
        'portfolio.pages.dev.example.com': undefined,
      };
      for (const [host, expected] of Object.entries(hosts)) {
        for (const path of ['/', '/pt-br/about', about.resume.href.en, '/og-image.jpg']) {
          const response = await request.get(path, { headers: { host } });
          expect(response.headers()['x-robots-tag'], `${host}${path}`).toBe(expected);
        }
      }
    });

    test('hashed assets are cached for a year', async ({ request, page }) => {
      await page.goto('/');
      const script = await page.locator('script[src^="/assets/"]').first().getAttribute('src');

      const headers = (await request.get(script!)).headers();

      expect(headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(headers['x-frame-options']).toBe('DENY');
    });

    test('the résumé PDFs have the other headers but no CSP (built-in PDF viewers)', async ({
      request,
    }) => {
      for (const href of [about.resume.href.en, about.resume.href['pt-BR']]) {
        const response = await request.get(href);

        expect(response.status(), href).toBe(200);
        expect(response.headers()['content-type'], href).toBe('application/pdf');
        expect(response.headers()['content-security-policy'], href).toBeUndefined();
        expect(response.headers()['x-content-type-options'], href).toBe('nosniff');
      }
    });

    test('the social preview is in the initial HTML and its image is served', async ({
      request,
    }) => {
      // Link-preview crawlers don't run JavaScript: the raw HTML must carry the card.
      for (const path of ['/', '/pt-br/about']) {
        const html = await (await request.get(path)).text();
        for (const tag of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card']) {
          expect(html, `${path} ${tag}`).toContain(`"${tag}"`);
        }
      }
      const image = await request.get('/og-image.jpg');

      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toBe('image/jpeg');
      expect(image.headers()['x-content-type-options']).toBe('nosniff');
      expect((await image.body()).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    });

    test('the build is marked static (build-mode.json)', async ({ request }) => {
      expect(await (await request.get('/build-mode.json')).json()).toEqual({ mode: 'static' });
    });
  });

  test.describe('missing and private files', () => {
    test('a missing asset is a real 404 (assets/404.html), not the shell', async ({ request }) => {
      for (const path of ['/assets/missing-0000.js', '/assets/old/x.css']) {
        const response = await request.get(path);

        expect(response.status(), path).toBe(404);
        expect(await response.text()).not.toContain('id="root"');
        expect(response.headers()['cache-control']).not.toContain('immutable');
      }
    });

    test('the Pages configuration file is not served', async ({ request }) => {
      const response = await request.get('/_headers');

      expect(await response.text()).not.toContain('Content-Security-Policy');
    });
  });

  test.describe('in the browser', () => {
    /** CSP violations, console and page errors, failed requests and any API request. */
    async function watch(page: Page) {
      const problems: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI}`);
        });
      });
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console: ${message.text()}`);
      });
      page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api'))
          problems.push(`API: ${request.url()}`);
      });
      page.on('response', (response) => {
        if (response.status() >= 400)
          problems.push(`${String(response.status())} ${response.url()}`);
      });
      return problems;
    }

    test('every page in both languages works under the CSP, with its fonts, and no API call', async ({
      page,
    }) => {
      const problems = await watch(page);

      for (const { path, heading } of pages) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(await page.evaluate(() => document.fonts.check('1em "Inter Variable"')), path).toBe(
          true,
        );
      }
      expect(problems).toEqual([]);
    });

    test('Contact has the external channels and no form', async ({ page }) => {
      const problems = await watch(page);

      for (const path of ['/contact', '/pt-br/contact']) {
        await page.goto(path);
        for (const channel of contact.channels) {
          await expect(page.locator(`a[href="${channel.href}"]`)).toBeVisible();
        }
        await expect(page.locator('[data-contact-form]')).toHaveCount(0);
        await expect(page.locator('form')).toHaveCount(0);
      }
      expect(contact.channels.map((channel) => channel.href)).toEqual([
        expect.stringMatching(/^mailto:/),
        expect.stringMatching(/^https:\/\/www\.linkedin\.com\//),
        expect.stringMatching(/^https:\/\/github\.com\//),
      ]);
      expect(problems).toEqual([]);
    });
  });
});
