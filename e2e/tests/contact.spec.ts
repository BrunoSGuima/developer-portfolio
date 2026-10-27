import { expect, type Page, type Route, test } from '@playwright/test';
import { expectNoA11yViolations } from '../support/a11y.ts';
import {
  CONTACT_API,
  contactAlert,
  contactField,
  contactForm,
  contactStatus,
  contactSubmit,
  fillContact,
  sampleMessage,
} from '../support/contact.ts';
import { e2eMode } from '../support/mode.ts';
import { clickLanguage, horizontalOverflow } from '../support/shell.ts';
import { languageOf, messages } from '../support/site.ts';

// The contact form's behaviour in the browser, on both projects. The endpoint is always stubbed
// here (route.fulfill / route.abort never reach the API), so these tests can run in parallel
// with anything; real submissions live in contact-api.spec.ts.
test.skip(e2eMode !== 'fullstack', 'The contact form exists only in full-stack builds.');

const accepted = (route: Route) =>
  route.fulfill({ status: 202, json: { data: { status: 'received' } } });

/** Holds every submission until the test releases it, counting them. */
async function holdSubmissions(page: Page) {
  const requests: unknown[] = [];
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(CONTACT_API, async (route) => {
    requests.push(route.request().postDataJSON());
    await held;
    await accepted(route);
  });
  return { requests, release };
}

test.describe('the contact form (full-stack build, stubbed API)', () => {
  test('keeps the channels and sends in Portuguese, from the keyboard only', async ({ page }) => {
    const sent: unknown[] = [];
    await page.route(CONTACT_API, async (route) => {
      sent.push(route.request().postDataJSON());
      await accepted(route);
    });
    await page.goto('/pt-br/contact');
    await expect(page.getByRole('link', { name: /linkedin\.com/ })).toBeVisible();

    await contactField(page, 'name').focus();
    await page.keyboard.type(sampleMessage.name);
    await page.keyboard.press('Tab');
    await page.keyboard.type(sampleMessage.email);
    await page.keyboard.press('Tab');
    await page.keyboard.type(sampleMessage.message);
    await page.keyboard.press('Tab');
    await expect(contactSubmit(page)).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(contactStatus(page)).toHaveText(messages['pt-BR'].contact.form.sent);
    expect(sent).toEqual([{ ...sampleMessage, locale: 'pt-BR', website: '' }]);
  });

  test('checks the fields in the browser before sending anything', async ({ page }) => {
    let requests = 0;
    await page.route(CONTACT_API, async (route) => {
      requests += 1;
      await accepted(route);
    });
    await page.goto('/contact');

    await contactSubmit(page).click();

    await expect(contactField(page, 'name')).toBeFocused();
    await expect(contactField(page, 'name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-field-error="message"]')).toHaveText(
      messages.en.contact.form.errors.message.blank,
    );
    expect(requests).toBe(0);
  });

  test('sends once while pending, however often Send is pressed', async ({ page }) => {
    const { requests, release } = await holdSubmissions(page);
    await page.goto('/contact');
    await fillContact(page);

    await contactSubmit(page).click();
    await expect(contactSubmit(page)).toHaveText(messages.en.contact.form.sending);
    // Playwright's click() waits for an aria-disabled button, so press it like a keyboard user
    // (it keeps focus) and with a forced click, which skips the actionability checks.
    await expect(contactSubmit(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(contactSubmit(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await contactSubmit(page).click({ force: true });
    await expect(contactSubmit(page)).toHaveText(messages.en.contact.form.sending);
    release();

    await expect(contactStatus(page)).toHaveText(messages.en.contact.form.sent);
    expect(requests).toHaveLength(1);
  });

  test('keeps the text after a failed connection, explains it may have arrived, and sends again only when asked', async ({
    page,
  }) => {
    await page.route(CONTACT_API, (route) => route.abort('failed'));
    await page.goto('/contact');
    await fillContact(page);

    await contactSubmit(page).click();

    await expect(contactAlert(page)).toHaveText(messages.en.contact.form.network);
    await expect(contactField(page, 'message')).toHaveValue(sampleMessage.message);

    await page.unroute(CONTACT_API);
    await page.route(CONTACT_API, accepted);
    await contactSubmit(page).click();
    await expect(contactStatus(page)).toHaveText(messages.en.contact.form.sent);
    await expect(contactAlert(page)).toBeEmpty();
  });

  test('keeps the text after an unexpected server error', async ({ page }) => {
    await page.route(CONTACT_API, (route) =>
      route.fulfill({
        status: 500,
        json: { error: { code: 'internal_error', message: 'Internal Server Error', details: {} } },
      }),
    );
    await page.goto('/contact');
    await fillContact(page);

    await contactSubmit(page).click();

    await expect(contactAlert(page)).toHaveText(messages.en.contact.form.unavailable);
    await expect(contactField(page, 'email')).toHaveValue(sampleMessage.email);
  });

  test('keeps the draft when switching language', async ({ page }) => {
    await page.goto('/contact');
    await fillContact(page);

    await clickLanguage(page, languageOf('pt-BR').linkName);

    await expect(page).toHaveURL(/\/pt-br\/contact$/);
    await expect(contactField(page, 'name')).toHaveValue(sampleMessage.name);
    await expect(contactField(page, 'message')).toHaveValue(sampleMessage.message);
  });

  test('keeps a submission in flight across a language switch and confirms it in the new language, sending once', async ({
    page,
  }) => {
    const { requests, release } = await holdSubmissions(page);
    await page.goto('/contact');
    await fillContact(page);
    await contactSubmit(page).click();
    await expect(contactSubmit(page)).toHaveText(messages.en.contact.form.sending);

    await clickLanguage(page, languageOf('pt-BR').linkName);
    await expect(contactSubmit(page)).toHaveText(messages['pt-BR'].contact.form.sending);
    release();

    await expect(contactStatus(page)).toHaveText(messages['pt-BR'].contact.form.sent);
    await expect(contactField(page, 'name')).toHaveValue('');
    expect(requests).toEqual([{ ...sampleMessage, locale: 'en', website: '' }]);
  });

  test('fits the screen without horizontal scrolling', async ({ page }) => {
    await page.goto('/pt-br/contact');
    await expect(contactForm(page)).toBeVisible();

    expect(await horizontalOverflow(page)).toBe(0);
    const form = await contactForm(page).boundingBox();
    const viewport = page.viewportSize()!;
    expect(form!.x).toBeGreaterThanOrEqual(0);
    expect(form!.x + form!.width).toBeLessThanOrEqual(viewport.width);
  });

  for (const path of ['/contact', '/pt-br/contact']) {
    test(`has no axe violations at ${path}: idle, with errors and after sending`, async ({
      page,
    }) => {
      await page.route(CONTACT_API, accepted);
      await page.goto(path);
      await expect(contactForm(page)).toBeVisible();
      await expectNoA11yViolations(page, `${path} (idle)`);

      await contactSubmit(page).click();
      await expect(contactField(page, 'name')).toHaveAttribute('aria-invalid', 'true');
      await expectNoA11yViolations(page, `${path} (errors)`);

      await fillContact(page);
      await contactSubmit(page).click();
      await expect(contactStatus(page)).not.toBeEmpty();
      await expectNoA11yViolations(page, `${path} (sent)`);
    });
  }
});
