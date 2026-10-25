import { expect, type Page } from '@playwright/test';

/** Opens a page and waits until it has rendered (heading, fonts) and settled. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** The small-screen layout hides the nav links behind a Menu button. */
export async function openMenuIfCollapsed(page: Page) {
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) {
    if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
  }
}

/** The main navigation landmark, whatever its (translated) name. */
export const mainNav = (page: Page) => page.locator('[data-nav="main"]');

/** Follows a main-nav link like a visitor would (through the Menu on small screens). */
export async function clickNav(page: Page, label: string) {
  await openMenuIfCollapsed(page);
  await mainNav(page).getByRole('link', { name: label, exact: true }).click();
}

/** The visible language switcher link for a language (header or menu panel). */
export async function clickLanguage(page: Page, linkName: string) {
  await openMenuIfCollapsed(page);
  await page.getByRole('link', { name: linkName }).click();
}

/**
 * Marks the persistent shell (header, Fun Fact, nav mascot) and the window. If a navigation
 * reloaded the page or remounted the shell, `expectShellPersisted` fails.
 */
export async function markShell(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __e2eShell?: boolean }).__e2eShell = true;
    for (const selector of ['header', '[data-fun-fact]', '[data-mascot="header"]']) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) element.dataset.e2eShell = 'kept';
    }
  });
}

export async function expectShellPersisted(page: Page) {
  const state = await page.evaluate(() => ({
    sameWindow: (window as unknown as { __e2eShell?: boolean }).__e2eShell === true,
    remounted: ['header', '[data-fun-fact]', '[data-mascot="header"]'].filter((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      return element !== null && element.dataset.e2eShell !== 'kept';
    }),
  }));
  expect(state.sameWindow, 'the page reloaded').toBe(true);
  expect(state.remounted, 'shell parts were remounted').toEqual([]);
}

/**
 * Pixels by which the page is wider than the viewport (0 = it fits): the page's own scroll
 * width, and the header, main content and footer, which could otherwise be silently clipped
 * (the page region uses `overflow-x: clip`).
 */
export function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const widest = Math.max(
      document.documentElement.scrollWidth,
      ...['header', 'main', 'footer'].map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return 0;
        return Math.max(element.getBoundingClientRect().right, element.scrollWidth);
      }),
    );
    return Math.max(0, Math.ceil(widest - viewport));
  });
}

/** Fails the test on uncaught errors or console errors (e.g. a missing asset). */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}
