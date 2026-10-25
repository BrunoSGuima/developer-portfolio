import { expect, type Page, test } from '@playwright/test';
import { open } from '../support/shell.ts';
import { languageOf, LOCALES, messages, pageOf, pagesIn } from '../support/site.ts';

/** The focused element's accessible-ish name, and whether it shows a focus ring. */
function focused(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    return {
      name: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim(),
      ring: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
    };
  });
}

test.describe('keyboard', () => {
  for (const locale of LOCALES) {
    test(`skip link first, then a logical order with a visible focus ring (${locale})`, async ({
      page,
      isMobile,
    }) => {
      const strings = messages[locale];
      await open(page, pageOf('about', locale).path);

      await page.keyboard.press('Tab');
      expect(await focused(page)).toEqual({ name: strings.layout.skipLink, ring: true });

      // Brand, then (desktop) every nav link and both languages, or (mobile) the Menu button.
      const expected = isMobile
        ? [/Bruno Soares Guimarães/, /^Menu$/]
        : [
            /Bruno Soares Guimarães/,
            ...pagesIn(locale).map((section) => new RegExp(`^${section.label}$`)),
            languageOf('en').linkName,
            languageOf('pt-BR').linkName,
          ];
      for (const name of expected) {
        await page.keyboard.press('Tab');
        const stop = await focused(page);
        if (typeof name === 'string') expect(stop?.name).toBe(name);
        else expect(stop?.name).toMatch(name);
        expect(stop?.ring, `focus ring on ${stop?.name}`).toBe(true);
      }
    });
  }

  test('the skip link moves focus to the main content', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(page.locator('main')).toBeFocused();
  });
});
