import { expect, test } from '@playwright/test';
import {
  CONTACT_API,
  contactAlert,
  contactField,
  contactStatus,
  contactSubmit,
  fillContact,
  sampleMessage,
} from '../support/contact.ts';
import { e2eMarker, storedContactMessages } from '../support/database.ts';
import { e2eMode } from '../support/mode.ts';
import { resetRateLimits } from '../support/rateLimits.ts';
import { messages } from '../support/site.ts';

// Every real-API write to the rate-limited endpoint (POST /api/v1/contact_messages) lives in
// this file. They are isolated by resetting the e2e API's rate-limit store before each test,
// which is only safe while nothing else uses the endpoint: so this file runs serially, on the
// desktop project only, and every other spec stubs the endpoint with page.route. The messages
// land in the e2e database, which bin/e2e-server empties on every start (e2e:reset); each test
// marks its message and reads back what was stored (support/database.ts, e2e database only).
test.describe.configure({ mode: 'serial' });

test.skip(e2eMode !== 'fullstack', 'The API exists only in full-stack runs.');
test.skip(({ isMobile }) => isMobile, 'Real-API writes run on the desktop project only.');

test.beforeEach(() => resetRateLimits());

const message = {
  name: 'E2E Test',
  email: 'e2e@example.com',
  message: 'An end-to-end test message.',
  locale: 'en',
};

test.describe('rate-limit isolation between real-API tests', () => {
  test('a test starts with the full quota: five accepted messages, then 429', async ({
    request,
  }) => {
    for (let sent = 1; sent <= 5; sent += 1) {
      const response = await request.post('/api/v1/contact_messages', { data: message });
      expect(response.status(), `message ${String(sent)}`).toBe(202);
    }

    const limited = await request.post('/api/v1/contact_messages', { data: message });

    expect(limited.status()).toBe(429);
    expect(limited.headers()['retry-after']).toBe('3600');
  });

  test('the next test starts from zero again', async ({ request }) => {
    const response = await request.post('/api/v1/contact_messages', { data: message });

    expect(response.status()).toBe(202);
  });
});

/** The sample message with this test's marker in its text, to find it in the database. */
function markedMessage() {
  const marker = e2eMarker();
  return { marker, values: { ...sampleMessage, message: `${sampleMessage.message} ${marker}` } };
}

test.describe('the contact form against the real Rails API', () => {
  test('sends a message: 202, stored in PostgreSQL, a confirmation and an empty form', async ({
    page,
  }) => {
    const { marker, values } = markedMessage();
    await page.goto('/pt-br/contact');
    // Spaces and capitals the API normalises when it stores the message.
    await fillContact(page, {
      ...values,
      name: `  ${values.name}  `,
      email: 'E2E-Visitor@Example.com',
    });

    const [request, response] = await Promise.all([
      page.waitForRequest(CONTACT_API),
      page.waitForResponse(CONTACT_API),
      contactSubmit(page).click(),
    ]);

    expect(response.status()).toBe(202);
    expect(await response.json()).toEqual({ data: { status: 'received' } });
    expect(request.postDataJSON()).toEqual({
      name: `  ${values.name}  `,
      email: 'E2E-Visitor@Example.com',
      message: values.message,
      locale: 'pt-BR',
      website: '',
    });
    await expect(contactStatus(page)).toHaveText(messages['pt-BR'].contact.form.sent);
    await expect(contactStatus(page)).toBeFocused();
    await expect(contactField(page, 'message')).toHaveValue('');

    expect(storedContactMessages(marker)).toEqual([
      {
        name: values.name,
        email: 'e2e-visitor@example.com',
        message: values.message,
        locale: 'pt-BR',
      },
    ]);
  });

  test("shows the API's own 422 field errors (client checks bypassed in transit)", async ({
    page,
  }) => {
    // The form never sends invalid values, so the body is altered on its way to the real API,
    // which answers for itself.
    await page.route(CONTACT_API, (route) =>
      route.continue({
        postData: JSON.stringify({
          ...(route.request().postDataJSON() as object),
          email: 'e2e@example..com',
        }),
      }),
    );
    const { marker, values } = markedMessage();
    await page.goto('/contact');
    await fillContact(page, values);

    const [response] = await Promise.all([
      page.waitForResponse(CONTACT_API),
      contactSubmit(page).click(),
    ]);

    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: 'validation_failed', details: { email: ['invalid'] } },
    });
    await expect(page.locator('[data-field-error="email"]')).toHaveText(
      messages.en.contact.form.errors.email.invalid,
    );
    await expect(contactField(page, 'email')).toBeFocused();
    await expect(contactField(page, 'message')).toHaveValue(values.message);
    expect(storedContactMessages(marker)).toEqual([]);
  });

  test("reports the API's real 429 with its Retry-After, keeping the text", async ({
    page,
    request,
  }) => {
    for (let sent = 1; sent <= 5; sent += 1) {
      expect((await request.post('/api/v1/contact_messages', { data: message })).status()).toBe(
        202,
      );
    }
    const { marker, values } = markedMessage();
    await page.goto('/contact');
    await fillContact(page, values);

    const [response] = await Promise.all([
      page.waitForResponse(CONTACT_API),
      contactSubmit(page).click(),
    ]);

    expect(response.status()).toBe(429);
    expect(response.headers()['retry-after']).toBe('3600');
    await expect(contactAlert(page)).toHaveText(
      messages.en.contact.form.rateLimited.replace('{when}', 'in 1 hour'),
    );
    await expect(contactField(page, 'name')).toHaveValue(values.name);
    expect(storedContactMessages(marker)).toEqual([]);
  });

  test('answers a filled honeypot like an accepted message, but stores nothing', async ({
    page,
  }) => {
    const { marker, values } = markedMessage();
    await page.goto('/contact');
    await fillContact(page, values);
    // Only a bot can reach the hidden field.
    await page.locator('input[name="website"]').fill('https://bot.example', { force: true });

    const [request, response] = await Promise.all([
      page.waitForRequest(CONTACT_API),
      page.waitForResponse(CONTACT_API),
      contactSubmit(page).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({ website: 'https://bot.example' });
    expect(response.status()).toBe(202);
    await expect(contactStatus(page)).toHaveText(messages.en.contact.form.sent);
    expect(storedContactMessages(marker)).toEqual([]);
  });
});
