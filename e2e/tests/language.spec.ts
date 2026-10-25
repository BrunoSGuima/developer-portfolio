import { expect, test } from '@playwright/test';
import {
  clickLanguage,
  expectShellPersisted,
  markShell,
  open,
  openMenuIfCollapsed,
} from '../support/shell.ts';
import { languageOf, localizePath, notFoundCase, pageOf, pagesIn } from '../support/site.ts';

const en = languageOf('en');
const pt = languageOf('pt-BR');

test.describe('switching languages', () => {
  for (const page of pagesIn('en')) {
    test(`stays on the equivalent page: ${page.path} ↔ ${pageOf(page.id, 'pt-BR').path}`, async ({
      page: browser,
    }) => {
      const portuguese = pageOf(page.id, 'pt-BR');
      await open(browser, page.path);
      await markShell(browser);

      await clickLanguage(browser, pt.linkName);
      await expect(browser).toHaveURL(portuguese.path);
      await expect(browser.locator('main h1')).toHaveText(portuguese.heading);
      await expect(browser.locator('html')).toHaveAttribute('lang', pt.htmlLang);
      await expect(browser).toHaveTitle(portuguese.title);

      await clickLanguage(browser, en.linkName);
      await expect(browser).toHaveURL(page.path);
      await expect(browser.locator('main h1')).toHaveText(page.heading);
      await expect(browser.locator('html')).toHaveAttribute('lang', en.htmlLang);
      await expectShellPersisted(browser);
    });
  }

  test('marks the current language in the switcher', async ({ page }) => {
    await open(page, pageOf('about', 'pt-BR').path);
    await openMenuIfCollapsed(page);

    const current = page.locator('a[aria-current="true"][hreflang]').filter({ visible: true });
    await expect(current).toHaveAttribute('lang', pt.htmlLang);
  });

  test('keeps the query string and hash', async ({ page }) => {
    await open(page, '/about?ref=e2e#top');
    await clickLanguage(page, pt.linkName);

    await expect(page).toHaveURL('/pt-br/about?ref=e2e#top');
  });

  test('keeps an unknown address, showing the other language’s 404', async ({ page }) => {
    await open(page, notFoundCase('en').path);
    await clickLanguage(page, pt.linkName);

    await expect(page).toHaveURL(notFoundCase('pt-BR').path);
    await expect(page.locator('main h1')).toHaveText(notFoundCase('pt-BR').heading);
  });

  test('back and forward restore the language', async ({ page }) => {
    const projects = pageOf('projects', 'en');
    const projetos = pageOf('projects', 'pt-BR');
    await open(page, projects.path);
    await clickLanguage(page, pt.linkName);
    await expect(page.locator('main h1')).toHaveText(projetos.heading);

    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(projects.heading);
    await expect(page.locator('html')).toHaveAttribute('lang', en.htmlLang);
    await page.goForward();
    await expect(page.locator('main h1')).toHaveText(projetos.heading);
    await expect(page.locator('html')).toHaveAttribute('lang', pt.htmlLang);
  });

  test('the URL alone decides: "/" stays English after choosing Portuguese', async ({ page }) => {
    await open(page, '/');
    await clickLanguage(page, pt.linkName);
    await expect(page.locator('html')).toHaveAttribute('lang', pt.htmlLang);

    await open(page, '/');
    await expect(page.locator('html')).toHaveAttribute('lang', en.htmlLang);
    await expect(page.locator('main h1')).toHaveText(pageOf('home', 'en').heading);
    await open(page, localizePath('/', 'pt-BR'));
    await expect(page.locator('html')).toHaveAttribute('lang', pt.htmlLang);
  });
});
