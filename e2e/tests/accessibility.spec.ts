import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations } from '../support/a11y.ts';
import { open, openMenuIfCollapsed } from '../support/shell.ts';
import { languageOf, LOCALES, localizePath, notFoundCase, pages } from '../support/site.ts';

test.describe('axe (WCAG 2.2 AA + best practices) @a11y', () => {
  for (const page of pages) {
    test(`${page.path}`, async ({ page: browser }) => {
      await open(browser, page.path);
      await expectNoA11yViolations(browser, page.path);
    });
  }

  for (const locale of LOCALES) {
    test(`${notFoundCase(locale).path} (404)`, async ({ page }) => {
      await open(page, notFoundCase(locale).path);
      await expectNoA11yViolations(page, notFoundCase(locale).path);
    });

    test(`${localizePath('/', locale)} with the mobile menu open`, async ({ page, isMobile }) => {
      test.skip(!isMobile, 'the menu panel exists on small screens');
      await open(page, localizePath('/', locale));
      await openMenuIfCollapsed(page);
      await expectNoA11yViolations(page, 'the open menu');
    });
  }
});

/**
 * The lowest contrast between the text colour of `selector`'s elements and the pixels actually
 * behind their text (the text itself hidden), for text drawn over the illustration, where axe
 * can only say "needs review".
 */
async function contrastBehindText(page: Page, selector: string) {
  const targets = await page.evaluate((query) => {
    return [...document.querySelectorAll<HTMLElement>(query)].map((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()].map((rect) => ({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      }));
      const color = getComputedStyle(element).color;
      element.style.color = 'transparent';
      return { rects, color };
    });
  }, selector);
  const image = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ({ image, targets }) => {
      const bitmap = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${image}`)).blob(),
      );
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (r: number, g: number, b: number) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      let worst = Infinity;
      for (const { rects, color } of targets) {
        const [r, g, b] = color.match(/\d+/g)!.map(Number) as [number, number, number];
        const text = luminance(r, g, b);
        for (const rect of rects) {
          const pixels = context.getImageData(rect.x, rect.y, rect.width, rect.height).data;
          for (let i = 0; i < pixels.length; i += 4) {
            const background = luminance(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
            const ratio = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
            worst = Math.min(worst, ratio);
          }
        }
      }
      return worst;
    },
    { image, targets },
  );
}

test.describe('contrast over the illustration @a11y', () => {
  for (const locale of LOCALES) {
    test(`the Home hero text stays ≥ 4.5:1 over the artwork (${locale})`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'the desktop hero sits over the artwork');
      await open(page, localizePath('/', locale));

      const worst = await contrastBehindText(page, '[data-slot="hero"] :is(h1, p), #what-i-do');
      expect(worst).toBeGreaterThanOrEqual(4.5);
    });
  }
});

test.describe('forced colours (high contrast) @a11y', () => {
  test('the current language is shown without relying on colour', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, '/');
    await openMenuIfCollapsed(page);

    const current = page
      .getByRole('link', { name: languageOf('en').linkName })
      .filter({ visible: true });
    await expect(current).toHaveCSS('text-decoration-line', 'underline');
  });
});
