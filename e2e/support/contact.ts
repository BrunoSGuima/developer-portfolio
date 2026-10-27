import { expect, type Page } from '@playwright/test';

/** The contact form's endpoint, for page.route and waitForRequest. */
export const CONTACT_API = '**/api/v1/contact_messages';

export const contactForm = (page: Page) => page.locator('[data-contact-form]');
export const contactField = (page: Page, name: 'name' | 'email' | 'message') =>
  page.locator(`[data-field="${name}"]`).locator('input, textarea');
export const contactSubmit = (page: Page) => page.locator('[data-contact-submit]');
export const contactStatus = (page: Page) => page.locator('[data-contact-status]');
export const contactAlert = (page: Page) => page.locator('[data-contact-alert]');

export const sampleMessage = {
  name: 'E2E Visitor',
  email: 'e2e-visitor@example.com',
  message: 'Hello from the end-to-end tests: this message is test data.',
};

/** Types a message into the form, as a visitor would. */
export async function fillContact(page: Page, values = sampleMessage) {
  await expect(contactForm(page)).toBeVisible();
  await contactField(page, 'name').fill(values.name);
  await contactField(page, 'email').fill(values.email);
  await contactField(page, 'message').fill(values.message);
}
