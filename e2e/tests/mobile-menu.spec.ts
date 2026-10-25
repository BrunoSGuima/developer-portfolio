import { expect, test } from '@playwright/test';
import { mainNav, open } from '../support/shell.ts';
import { languageOf, pageOf } from '../support/site.ts';

// The collapsible menu exists on small screens only.
test.skip(({ isMobile }) => !isMobile, 'small screens only');

test.describe('mobile menu', () => {
  test('opens and closes with the Menu button and Escape, returning focus', async ({ page }) => {
    await open(page, '/');
    const menu = page.getByRole('button', { name: 'Menu' });
    const firstLink = mainNav(page).getByRole('link').first();

    await expect(firstLink).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(firstLink).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(firstLink).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test('closes when tapping outside it', async ({ page }) => {
    await open(page, '/');
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click();

    await page.locator('main h1').click();

    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes after choosing a section', async ({ page }) => {
    const contact = pageOf('contact', 'en');
    await open(page, '/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await mainNav(page).getByRole('link', { name: contact.label, exact: true }).click();

    await expect(page.locator('main h1')).toHaveText(contact.heading);
    await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('holds the language switcher, and closes after a switch', async ({ page }) => {
    await open(page, pageOf('about', 'en').path);
    const menu = page.getByRole('button', { name: 'Menu' });
    const portuguese = page.getByRole('link', { name: languageOf('pt-BR').linkName });

    await expect(portuguese).toBeHidden();
    await menu.click();
    await expect(portuguese).toBeVisible();
    await portuguese.click();

    await expect(page.locator('main h1')).toHaveText(pageOf('about', 'pt-BR').heading);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  });
});
