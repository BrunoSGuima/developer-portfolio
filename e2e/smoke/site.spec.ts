import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import { about } from '../../apps/shell/src/content/profile.ts';
import { contactStatus, contactSubmit, fillContact } from '../support/contact.ts';
import { clickLanguage, clickNav } from '../support/shell.ts';
import { languageOf, messages, pages } from '../support/site.ts';

// Checks that the deployed site works in a real browser, under its real headers and Content
// Security Policy (playwright.smoke.config.ts): every page in both languages loads with all its
// assets and fonts, navigation and the language switch work, and nothing is blocked or fails.
// It works on either build: the site's own build-mode.json says whether to expect the contact
// form (full-stack) or only the channels (static). Read-only by default; SMOKE_WRITE=1 (only
// against a throwaway database) also submits the contact form on a full-stack site.
const writes = process.env['SMOKE_WRITE'] === '1';

/** The deployed build's mode, as the build itself records it (build-mode.json). */
async function siteMode(request: APIRequestContext): Promise<'static' | 'fullstack'> {
  const { mode } = (await (await request.get('/build-mode.json')).json()) as { mode: unknown };
  if (mode !== 'static' && mode !== 'fullstack')
    throw new Error(`Unknown build mode: ${String(mode)}`);
  return mode;
}

/** Fails the test on CSP violations, console errors, page errors and failed same-origin requests. */
async function watch(page: Page) {
  const problems: string[] = [];
  const origin = new URL(test.info().project.use.baseURL ?? '').origin;
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (new URL(response.url()).origin === origin && response.status() >= 400) {
      problems.push(`${String(response.status())} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));
  return problems;
}

for (const { path, heading } of pages) {
  test(`${path} renders with its assets and fonts, under the CSP`, async ({ page }) => {
    const problems = await watch(page);

    const response = await page.goto(path);

    expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await page.waitForLoadState('networkidle');
    // The self-hosted Inter font loaded (font-src 'self').
    expect(await page.evaluate(() => document.fonts.check('1em "Inter Variable"'))).toBe(true);
    expect(problems).toEqual([]);
  });
}

test('the main navigation and the language switch work under the CSP', async ({ page }) => {
  const problems = await watch(page);
  await page.goto('/');

  for (const id of ['about', 'projects', 'architecture', 'contact']) {
    const target = pages.find((candidate) => candidate.id === id && candidate.locale === 'en')!;
    await clickNav(page, target.label);
    await expect(page.getByRole('heading', { level: 1, name: target.heading })).toBeVisible();
  }
  await clickLanguage(page, languageOf('pt-BR').linkName);
  await expect(page).toHaveURL(/\/pt-br\/contact$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  expect(problems).toEqual([]);
});

test('the Projects page shows its data; Contact has its channels (and the form when full-stack)', async ({
  page,
  request,
}) => {
  const problems = await watch(page);
  const mode = await siteMode(request);

  await page.goto('/pt-br/projects');
  await expect(page.getByRole('article').first()).toBeVisible();
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: /linkedin\.com/ })).toBeVisible();
  await expect(page.locator('[data-contact-form]')).toHaveCount(mode === 'fullstack' ? 1 : 0);
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test('each résumé PDF is served as a PDF, without a document policy', async ({ page, request }) => {
  for (const [path, href] of [
    ['/about', about.resume.href.en],
    ['/pt-br/about', about.resume.href['pt-BR']],
  ] as const) {
    await page.goto(path);
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();

    const response = await request.get(href);

    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toBe('application/pdf');
    expect(response.headers()['content-security-policy'], href).toBeUndefined();
    expect((await response.body()).subarray(0, 5).toString(), href).toBe('%PDF-');
  }
});

test('an unknown page shows the shell’s 404 page', async ({ page }) => {
  const response = await page.goto('/does-not-exist');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: messages.en.notFound.title }),
  ).toBeVisible();
});

test('the contact form sends a message under the CSP (SMOKE_WRITE=1 only)', async ({
  page,
  request,
}) => {
  test.skip(!writes, 'Read-only by default: writes only against a throwaway database.');
  test.skip((await siteMode(request)) === 'static', 'A static site has no contact form.');
  const problems = await watch(page);
  await page.goto('/contact');

  await fillContact(page, {
    name: 'Browser Smoke',
    email: 'browser-smoke@example.com',
    message: 'A browser smoke-test message (throwaway database).',
  });
  await contactSubmit(page).click();

  await expect(contactStatus(page)).toHaveText(messages.en.contact.form.sent);
  expect(problems).toEqual([]);
});
