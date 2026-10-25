import { expect, test } from '@playwright/test';
import { collectErrors, horizontalOverflow, open } from '../support/shell.ts';
import {
  languageOf,
  LOCALES,
  localeConfig,
  localizePath,
  notFoundCase,
  pages,
} from '../support/site.ts';

test.describe('every page, in every language', () => {
  for (const page of pages) {
    test(`${page.path} renders its page with the right language and metadata`, async ({
      page: browser,
      baseURL,
    }) => {
      const errors = collectErrors(browser);
      await open(browser, page.path);

      await expect(browser.locator('main h1')).toHaveText(page.heading);
      await expect(browser).toHaveTitle(page.title);
      await expect(browser.locator('html')).toHaveAttribute(
        'lang',
        languageOf(page.locale).htmlLang,
      );
      await expect(browser.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        page.description,
      );
      await expect(browser.locator('[data-fun-fact]')).toContainText(page.funFact);

      // Canonical URL and one alternate per language (+ x-default), all for this page.
      const neutral = page.path.replace(/^\/pt-br(?=\/|$)/, '') || '/';
      await expect(browser.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${baseURL}${page.path}`,
      );
      for (const locale of LOCALES) {
        await expect(
          browser.locator(`link[rel="alternate"][hreflang="${localeConfig[locale].htmlLang}"]`),
        ).toHaveAttribute('href', `${baseURL}${localizePath(neutral, locale)}`);
      }
      await expect(browser.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        'href',
        `${baseURL}${neutral}`,
      );

      expect(await horizontalOverflow(browser)).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  for (const locale of LOCALES) {
    const missing = notFoundCase(locale);
    test(`${missing.path} shows the ${locale} 404 inside the shell, without canonical links`, async ({
      page,
    }) => {
      await open(page, missing.path);

      await expect(page.locator('main h1')).toHaveText(missing.heading);
      await expect(page).toHaveTitle(missing.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        missing.description,
      );
      await expect(page.locator('[data-fun-fact]')).toContainText(missing.funFact);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.locator('link[rel="canonical"], link[rel="alternate"]')).toHaveCount(0);
    });
  }
});

test.describe('direct links and refresh (SPA fallback)', () => {
  test('a refresh keeps the page and its language', async ({ page }) => {
    const about = pages.find(
      (candidate) => candidate.id === 'about' && candidate.locale === 'pt-BR',
    )!;
    await open(page, about.path);
    await page.reload();

    await expect(page.locator('main h1')).toHaveText(about.heading);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });

  test('the Portuguese home works with a trailing slash', async ({ page }) => {
    await open(page, '/pt-br/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/pt-br$/);
  });
});
