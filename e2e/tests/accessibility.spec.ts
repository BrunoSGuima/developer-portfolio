import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations } from '../support/a11y.ts';
import { open, openMenuIfCollapsed, waitForStableLayout } from '../support/shell.ts';
import {
  languageOf,
  LOCALES,
  localizePath,
  messages,
  notFoundCase,
  pages,
} from '../support/site.ts';

// Both themes (ADR-0017): the light theme as approved, the dark one through the system
// preference (the same tokens as an explicit choice; tests/theme.spec.ts covers the switching).
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe (WCAG 2.2 AA + best practices), ${colorScheme} theme @a11y`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    for (const page of pages) {
      test(`${page.path}`, async ({ page: browser }) => {
        await open(browser, page.path);
        expect(await browser.evaluate(() => document.documentElement.dataset.theme)).toBe(
          colorScheme,
        );
        await expectNoA11yViolations(browser, `${page.path} (${colorScheme})`);
      });
    }

    for (const locale of LOCALES) {
      test(`${notFoundCase(locale).path} (404)`, async ({ page }) => {
        await open(page, notFoundCase(locale).path);
        await expectNoA11yViolations(page, `${notFoundCase(locale).path} (${colorScheme})`);
      });

      test(`${localizePath('/', locale)} with the mobile menu open`, async ({ page, isMobile }) => {
        test.skip(!isMobile, 'the menu panel exists on small screens');
        await open(page, localizePath('/', locale));
        await openMenuIfCollapsed(page);
        await expectNoA11yViolations(page, `the open menu (${colorScheme})`);
      });
    }
  });
}

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
  // Let the browser paint the hidden text before photographing it (otherwise the screenshot can
  // still show the previous frame, text included).
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const image = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ({ image, targets }) => {
      // Decoded without fetch(): the site's Content Security Policy (connect-src 'self') rightly
      // blocks fetching a data: URL, and the static suite runs under it (Cloudflare Pages).
      const bytes = Uint8Array.from(atob(image), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
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
  for (const [locale, colorScheme] of LOCALES.flatMap((locale) =>
    (['light', 'dark'] as const).map((scheme) => [locale, scheme] as const),
  )) {
    test(`the Home hero text stays ≥ 4.5:1 over the artwork (${locale}, ${colorScheme})`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'the desktop hero sits over the artwork');
      await page.emulateMedia({ colorScheme });
      await open(page, localizePath('/', locale));
      // Text boxes are measured, then the page is photographed: nothing may move in between.
      await waitForStableLayout(page);

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

  test('the dark theme toggle shows its pressed state without relying on colour', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
    await open(page, '/');
    await openMenuIfCollapsed(page);

    const toggle = page
      .getByRole('button', { name: messages.en.layout.themeToggle })
      .filter({ visible: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveCSS('outline-style', 'solid');
  });
});
