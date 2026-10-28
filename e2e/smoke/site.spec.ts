import { expect, type Page, test } from '@playwright/test';

// Read-only checks that the deployed site works end to end: pages load with all their assets,
// the full-stack data arrives from the API, and nothing fails in the browser.
// (playwright.smoke.config.ts; never writes: the contact form is not submitted.)

/** Fails the test on console errors, page errors and failed same-origin requests. */
function watch(page: Page) {
  const problems: string[] = [];
  const origin = new URL(test.info().project.use.baseURL ?? '').origin;
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

for (const path of ['/', '/pt-br/']) {
  test(`${path} renders with all its assets`, async ({ page }) => {
    const problems = watch(page);

    await page.goto(path);

    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('#what-i-do')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });
}

test('a deep link loads the Projects page with the API data', async ({ page }) => {
  const problems = watch(page);

  await page.goto('/pt-br/projects');

  await expect(page.getByRole('article').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test('the Contact page has its channels and, in a full-stack build, the form', async ({ page }) => {
  const problems = watch(page);

  await page.goto('/contact');

  await expect(page.getByRole('link', { name: /linkedin\.com/ })).toBeVisible();
  await expect(page.locator('[data-contact-form]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test('an unknown page shows the shell’s 404 page', async ({ page }) => {
  const response = await page.goto('/does-not-exist');

  expect(response?.status()).toBe(200);
  await expect(page.locator('main h1')).toBeVisible();
});
