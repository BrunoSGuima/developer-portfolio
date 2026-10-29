import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations } from '../support/a11y.ts';
import { contactField, contactForm, contactSubmit } from '../support/contact.ts';
import { e2eMode } from '../support/mode.ts';
import {
  clickLanguage,
  clickNav,
  markShell,
  expectShellPersisted,
  open,
  openMenuIfCollapsed,
  waitForStableLayout,
} from '../support/shell.ts';
import { languageOf, messages, pageOf, pagesIn, type Locale } from '../support/site.ts';

// Light and dark themes (Step 4.6a, ADR-0017): the system preference until the visitor chooses,
// the choice remembered across reloads, navigation and languages, applied before the first paint.

const NAVY = 'rgb(14, 20, 34)'; // --color-bg, dark
const SAND = 'rgb(233, 226, 221)'; // --color-bg, light

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const stored = (page: Page) => page.evaluate(() => window.localStorage.getItem('theme'));
const pageBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** The visible toggle (the header's, or the menu panel's on small screens). */
async function toggle(page: Page, locale: Locale = 'en') {
  await openMenuIfCollapsed(page);
  return page
    .getByRole('button', { name: messages[locale].layout.themeToggle, exact: true })
    .filter({ visible: true });
}

async function expectTheme(page: Page, expected: 'light' | 'dark') {
  expect(await theme(page)).toBe(expected);
  expect(await pageBackground(page)).toBe(expected === 'dark' ? NAVY : SAND);
}

test.describe('the system preference', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`a ${colorScheme} system gets the ${colorScheme} theme, with nothing stored`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await open(page, '/');

      await expectTheme(page, colorScheme);
      expect(await stored(page)).toBeNull();
      await expect(await toggle(page)).toHaveAttribute(
        'aria-pressed',
        String(colorScheme === 'dark'),
      );
    });
  }

  test('is followed live until the visitor chooses', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page, '/about');

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(page)).toBe('dark');

    await (await toggle(page)).click(); // an explicit choice: light
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await theme(page)).toBe('light');
    expect(await stored(page)).toBe('light');
  });
});

test.describe('an explicit choice', () => {
  test('is remembered across reloads, every section, a language switch and history', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page, '/');
    await (await toggle(page)).click();
    await expectTheme(page, 'dark');
    expect(await stored(page)).toBe('dark');

    await page.reload();
    await expect(page.locator('main h1')).toBeVisible();
    await expectTheme(page, 'dark');

    await markShell(page);
    for (const section of pagesIn('en').slice(1)) {
      await clickNav(page, section.label);
      await expect(page.locator('main h1')).toHaveText(section.heading);
      await expectTheme(page, 'dark');
    }
    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'pt-BR').heading);
    await expectTheme(page, 'dark');
    await expect(await toggle(page, 'pt-BR')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');

    await page.goBack();
    await expect(page.locator('main h1')).toHaveText(pageOf('contact', 'en').heading);
    await expectTheme(page, 'dark');
    await expectShellPersisted(page);
  });

  for (const [choice, system] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const) {
    test(`${choice} wins over a ${system} system, from the first paint`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      await page.addInitScript((value) => {
        window.localStorage.setItem('theme', value);
        // Records the theme when <body> appears: before any content can paint. (Init scripts run
        // before <html> exists, so the whole document is observed.)
        new MutationObserver((_records, observer) => {
          if (!document.body) return;
          (window as unknown as { __themeAtBody?: string }).__themeAtBody =
            document.documentElement.dataset.theme ?? 'unset';
          observer.disconnect();
        }).observe(document, { childList: true, subtree: true });
      }, choice);

      await open(page, '/pt-br/about');

      expect(
        await page.evaluate(() => (window as unknown as { __themeAtBody?: string }).__themeAtBody),
      ).toBe(choice);
      await expectTheme(page, choice);
    });
  }

  test('the theme script runs in <head> before the stylesheets, from the same origin', async ({
    page,
  }) => {
    await open(page, '/');
    const head = await page.evaluate(() =>
      [...document.head.children].map((element) => {
        if (element instanceof HTMLScriptElement) return `script:${element.getAttribute('src')}`;
        if (element instanceof HTMLLinkElement && element.rel === 'stylesheet') return 'stylesheet';
        return element.tagName.toLowerCase();
      }),
    );
    const script = head.indexOf('script:/theme-init.js');
    expect(script).toBeGreaterThan(-1);
    for (const [index, entry] of head.entries()) {
      if (entry === 'stylesheet') expect(index).toBeGreaterThan(script);
    }
  });
});

test.describe('the toggle', () => {
  test('is reached and operated with the keyboard; focus stays on it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page, '/');
    const button = await toggle(page);

    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expectTheme(page, 'dark');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expectTheme(page, 'light');
  });

  test('sits beside EN/PT at every width: menu panel, header lane, inline', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Widths are set explicitly on the desktop project.');
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, '/about');
      const button = await toggle(page);
      const language = page
        .getByRole('navigation', { name: messages.en.layout.languageNav })
        .filter({ visible: true });
      const [a, b] = [await language.boundingBox(), await button.boundingBox()];

      expect(a && b, `${width}px`).toBeTruthy();
      // Same row, the toggle right after the language switcher.
      expect(Math.abs(a!.y + a!.height / 2 - (b!.y + b!.height / 2)), `${width}px`).toBeLessThan(2);
      expect(b!.x, `${width}px`).toBeGreaterThan(a!.x + a!.width);
      expect(b!.x - (a!.x + a!.width), `${width}px`).toBeLessThan(16);
      await page.keyboard.press('Escape');
    }
  });

  // The toggle shares the EN/PT pill so the desktop header stays one row: it once wrapped the
  // brand name at 1024–1039px with classic scrollbars (the desktop project has real ones).
  test('the desktop header keeps one row from 1024px, in both languages', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop widths, with real scrollbars.');
    const header = async () =>
      page.evaluate(() => {
        const name = document.querySelector('header a span')!;
        return {
          height: Math.round(document.querySelector('header')!.getBoundingClientRect().height),
          nameLines: Math.round(
            name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight),
          ),
        };
      });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, '/');
    const reference = await header();

    for (const width of [1024, 1040, 1152, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['architecture', 'contact', 'projects']) {
        for (const locale of ['en', 'pt-BR'] as const) {
          await open(page, pageOf(id, locale).path);
          expect(await header(), `${width}px ${pageOf(id, locale).path}`).toEqual({
            height: reference.height,
            nameLines: 1,
          });
        }
      }
    }
  });

  test('switching theme moves nothing', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page, '/');
    await waitForStableLayout(page);
    const layout = () =>
      page.evaluate(() =>
        [
          'header',
          'main h1',
          '[data-fun-fact]',
          '#what-i-do',
          '[data-slot="hero"]',
          '[data-nav="main"]',
          '[data-slot="backdrop"]',
          '[data-slot="backdrop"] picture[data-active="true"] img',
        ].map((selector) => {
          const box = document.querySelector(selector)?.getBoundingClientRect();
          return box && [box.x, box.y, box.width, box.height].map((n) => Math.round(n * 2) / 2);
        }),
      );
    const before = await layout();

    await (await toggle(page)).click();
    await page.keyboard.press('Escape');
    await waitForStableLayout(page);

    expect(await layout()).toEqual(before);
  });
});

test.describe('full-stack pages in the dark theme', () => {
  test.skip(
    e2eMode !== 'fullstack',
    'The contact form and the API exist only in full-stack builds.',
  );

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('the contact form and its errors are accessible', async ({ page }) => {
    await open(page, '/contact');
    await expect(contactForm(page)).toBeVisible();
    await contactSubmit(page).click(); // empty: client-side errors
    await expect(contactField(page, 'name')).toHaveAttribute('aria-invalid', 'true');
    await expectTheme(page, 'dark');
    await expectNoA11yViolations(page, 'the contact form with errors, dark');
  });

  test('the Projects error state is accessible', async ({ page }) => {
    await page.route('**/api/v1/projects*', (route) =>
      route.fulfill({
        status: 500,
        json: { error: { code: 'internal_error', message: 'Internal Server Error', details: {} } },
      }),
    );
    await page.goto('/projects');
    await expect(page.getByRole('alert')).toContainText(messages.en.projects.error);
    await expectNoA11yViolations(page, 'the Projects error, dark');
  });
});

// The Home backdrop (Step 4.6b): the day painting in light, the night painting in dark, both drawn
// at their natural aspect ratio (the approved framing), the right one from the first request.
test.describe('the Home backdrop', () => {
  const BACKDROP = /\/hero(Desktop|Mobile)(Night)?-\d+[^/]*\.webp$/;

  /** The painting on top: its key, the file the browser chose and the rendered box. */
  const activePainting = (page: Page) =>
    page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>(
        '[data-slot="backdrop"] picture[data-active="true"] img',
      )!;
      const box = img.getBoundingClientRect();
      return {
        theme: img.closest('picture')!.dataset.backdropTheme,
        current: img.currentSrc.split('/').pop()!,
        width: box.width,
        height: box.height,
        ratio: img.naturalHeight / img.naturalWidth,
      };
    });

  const settled = (page: Page) =>
    page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLImageElement>('[data-slot="backdrop"] img')].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    );

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${colorScheme}: only its own painting is requested on the first load`, async ({
      page,
      isMobile,
    }) => {
      const requested: string[] = [];
      page.on('request', (request) => {
        if (BACKDROP.test(request.url())) requested.push(new URL(request.url()).pathname);
      });
      await page.emulateMedia({ colorScheme });
      await open(page, '/');
      await settled(page);

      const painting = await activePainting(page);
      expect(painting.theme).toBe(colorScheme);
      expect(painting.current).toMatch(
        new RegExp(
          `^hero${isMobile ? 'Mobile' : 'Desktop'}${colorScheme === 'dark' ? 'Night' : ''}-`,
        ),
      );
      expect(requested).toHaveLength(1);
      expect(requested[0]).toContain(painting.current.split('-')[0]!);
    });

    test(`${colorScheme}: the painting keeps its natural aspect ratio at every width (never cropped or zoomed)`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'Widths are set explicitly on the desktop project.');
      await page.emulateMedia({ colorScheme });
      for (const width of [375, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await open(page, '/');
        await settled(page);
        const painting = await activePainting(page);

        expect(painting.current, `${width}px`).toMatch(
          width < 768 ? /^heroMobile/ : /^heroDesktop/,
        );
        expect(
          Math.abs(painting.height - painting.width * painting.ratio),
          `${width}px`,
        ).toBeLessThan(1);
      }
    });
  }

  test('switching crossfades to the other painting once loaded, and moves nothing', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await open(page, '/');
    await settled(page);
    const backdropBox = () =>
      page.evaluate(() => {
        const box = document
          .querySelector('[data-slot="backdrop"] picture[data-active="true"] img')!
          .getBoundingClientRect();
        return [box.x, box.y, box.width, box.height].map(Math.round);
      });
    const before = await backdropBox();

    await (await toggle(page)).click();
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await activePainting(page)).theme).toBe('dark');
    await settled(page);

    expect(await backdropBox()).toEqual(before);
    const fade = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('[data-slot="backdrop"] picture[data-active="true"]')!,
        ).transitionDuration,
    );
    expect(fade).toBe('0.25s');

    // Back to light: the day painting is still loaded, so it's on top at once.
    await (await toggle(page)).click();
    await page.keyboard.press('Escape');
    expect((await activePainting(page)).theme).toBe('light');
  });

  test('the crossfade is instant under reduced motion', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await open(page, '/');
    const fade = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('[data-slot="backdrop"] picture[data-active="true"]')!,
        ).transitionDuration,
    );
    expect(fade).toBe('0s');
  });
});
