import { expect, test } from '@playwright/test';
import {
  clickNav,
  expectShellPersisted,
  mainNav,
  markShell,
  open,
  openMenuIfCollapsed,
} from '../support/shell.ts';
import { LOCALES, localizePath, messages, notFoundCase, pageOf, pagesIn } from '../support/site.ts';

test.describe('navigating between sections', () => {
  for (const locale of LOCALES) {
    test(`visits every section in ${locale} without reloading or remounting the shell`, async ({
      page,
    }) => {
      const sections = pagesIn(locale);
      await open(page, sections[0]!.path);
      await markShell(page);

      for (const section of [...sections.slice(1), sections[0]!]) {
        await clickNav(page, section.label);

        const heading = page.locator('main h1');
        await expect(heading).toHaveText(section.heading);
        await expect(page).toHaveURL(section.path);
        await expect(heading).toBeFocused();
        await expect(page.locator('[data-fun-fact]')).toContainText(section.funFact);
        await openMenuIfCollapsed(page);
        await expect(
          mainNav(page).getByRole('link', { name: section.label, exact: true }),
        ).toHaveAttribute('aria-current', 'page');
        await expectShellPersisted(page);
        await page.keyboard.press('Escape'); // close the menu again on small screens
      }
    });
  }

  test('back and forward restore the pages', async ({ page }) => {
    const [home, about, projects] = [
      pageOf('home', 'en'),
      pageOf('about', 'en'),
      pageOf('projects', 'en'),
    ];
    await open(page, home.path);
    await markShell(page);
    await clickNav(page, about.label);
    await expect(page.locator('main h1')).toHaveText(about.heading);
    await clickNav(page, projects.label);
    await expect(page.locator('main h1')).toHaveText(projects.heading);

    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(about.heading);
    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(home.heading);
    await page.goForward();
    await expect(page.locator('main h1')).toHaveText(about.heading);
    await expectShellPersisted(page);
  });
});

test.describe('links inside pages lead to the localized page', () => {
  for (const locale of LOCALES) {
    const strings = messages[locale];

    test(`Home buttons and links (${locale})`, async ({ page }) => {
      const cases = [
        [new RegExp(strings.home.viewProjects), 'projects'],
        [new RegExp(`^${strings.home.aboutMe}$`), 'about'],
        [new RegExp(strings.home.exploreArchitecture), 'architecture'],
      ] as const;
      for (const [name, target] of cases) {
        await open(page, localizePath('/', locale));
        await page.locator('main').getByRole('link', { name }).click();
        await expect(page).toHaveURL(pageOf(target, locale).path);
        await expect(page.locator('main h1')).toHaveText(pageOf(target, locale).heading);
      }
    });

    test(`the brand, the Projects → About link and the 404 home link (${locale})`, async ({
      page,
    }) => {
      const home = pageOf('home', locale);

      await open(page, pageOf('contact', locale).path);
      await page.getByRole('link', { name: /Bruno Soares Guimarães/ }).click();
      await expect(page).toHaveURL(home.path);

      await open(page, pageOf('projects', locale).path);
      await page
        .locator('main')
        .getByRole('link', { name: strings.projects.leadLink, exact: true })
        .click();
      await expect(page).toHaveURL(pageOf('about', locale).path);

      await open(page, notFoundCase(locale).path);
      await page.getByRole('link', { name: strings.notFound.home }).click();
      await expect(page).toHaveURL(home.path);
      await expect(page.locator('main h1')).toHaveText(home.heading);
    });
  }
});
