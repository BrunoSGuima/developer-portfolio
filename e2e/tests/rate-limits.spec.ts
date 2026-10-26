import { expect, test } from '@playwright/test';
import { e2eMode } from '../support/mode.ts';
import { resetRateLimits } from '../support/rateLimits.ts';

// Real-API writes to a rate-limited endpoint (POST /api/v1/contact_messages) are isolated by
// resetting the e2e API's rate-limit store before each test. That is only safe while nothing
// else uses the endpoint, so such specs run serially, on the desktop project only.
test.describe.configure({ mode: 'serial' });

test.skip(e2eMode !== 'fullstack', 'The API exists only in full-stack runs.');

test.describe('rate-limit isolation between real-API tests', () => {
  test.skip(({ isMobile }) => isMobile, 'Real-API writes run on the desktop project only.');

  test.beforeEach(() => resetRateLimits());

  const message = {
    name: 'E2E Test',
    email: 'e2e@example.com',
    message: 'An end-to-end test message.',
    locale: 'en',
  };

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
