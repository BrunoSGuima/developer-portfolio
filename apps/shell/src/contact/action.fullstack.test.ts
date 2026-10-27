import type { ActionFunctionArgs } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contactMessageAccepted, errorResponse } from '../api/fixtures.ts';
import { clearDraft, getDraft, saveDraft } from './draft.ts';

// The Contact action as built in full-stack mode: the env value the build bakes in
// (vite.config.ts), set before the module loads; fetch is stubbed, so no request leaves the test.
vi.stubEnv('VITE_APP_MODE', 'fullstack');
vi.mock('../config/mode.ts', () => ({
  APP_MODES: ['static', 'fullstack'],
  appMode: 'fullstack',
  isFullStack: true,
}));
const { contactAction } = await import('./action.ts');

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const values = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello, shall we talk?' };

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

function submit(fields: Record<string, string> = values, path = '/contact') {
  const body = new FormData();
  for (const [name, value] of Object.entries({ website: '', ...fields })) body.set(name, value);
  const request = new Request(`http://localhost${path}`, { method: 'POST', body });
  return contactAction({ request, params: {}, context: {} } as ActionFunctionArgs);
}

beforeEach(() => clearDraft());
afterEach(() => fetchMock.mockReset());

describe('contactAction, full-stack build', () => {
  it('sends the message as JSON, same-origin, with the page language', async () => {
    fetchMock.mockResolvedValue(json(contactMessageAccepted, 202));

    await expect(submit(values, '/pt-br/contact')).resolves.toEqual({ status: 'sent' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/contact_messages');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ ...values, locale: 'pt-BR', website: '' });
  });

  it('sends the honeypot as it was filled (the API decides)', async () => {
    fetchMock.mockResolvedValue(json(contactMessageAccepted, 202));

    await submit({ ...values, website: 'https://spam.example' });

    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toMatchObject({
      locale: 'en',
      website: 'https://spam.example',
    });
  });

  it('clears the draft only once the API has accepted the message', async () => {
    saveDraft(values);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await submit();
    expect(getDraft()).toEqual(values);

    fetchMock.mockResolvedValueOnce(json(contactMessageAccepted, 202));
    await submit();
    expect(getDraft()).toEqual({ name: '', email: '', message: '' });
  });

  it('never calls the API with values the API would reject', async () => {
    await expect(submit({ ...values, email: 'not-an-email', message: 'short' })).resolves.toEqual({
      status: 'invalid',
      errors: { email: 'invalid', message: 'too_short' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns the API's 422 into field errors (codes only)", async () => {
    fetchMock.mockResolvedValue(
      json(
        errorResponse('validation_failed', 'The message could not be sent', {
          email: ['invalid'],
          message: ['too_long', 'invalid'],
        }),
        422,
      ),
    );

    await expect(submit()).resolves.toEqual({
      status: 'invalid',
      errors: { email: 'invalid', message: 'too_long' },
    });
  });

  it('treats a 422 about no form field (e.g. locale) as unavailable', async () => {
    fetchMock.mockResolvedValue(
      json(errorResponse('validation_failed', 'x', { locale: ['inclusion'] }), 422),
    );

    await expect(submit()).resolves.toEqual({ status: 'unavailable' });
  });

  it('reports the rate limit with its Retry-After', async () => {
    fetchMock.mockResolvedValue(
      json(errorResponse('rate_limited', 'Too many messages'), 429, { 'Retry-After': '3600' }),
    );

    await expect(submit()).resolves.toEqual({ status: 'rate_limited', retryAfter: 3600 });
  });

  it('reports a failed connection as network (the message may have arrived)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(submit()).resolves.toEqual({ status: 'network' });
  });

  it.each([
    ['a server error', () => json(errorResponse('internal_error', 'Internal Server Error'), 500)],
    ['a malformed body', () => json(errorResponse('bad_request', 'Malformed JSON'), 400)],
    [
      'a proxy page',
      () =>
        new Response('<h1>Bad Gateway</h1>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
    ],
    ['an unexpected success body', () => json({ data: { status: 'queued' } }, 202)],
  ])('reports %s as unavailable', async (_label, response) => {
    fetchMock.mockResolvedValue(response());

    await expect(submit()).resolves.toEqual({ status: 'unavailable' });
  });

  it('never retries: one submission is one request, whatever the outcome', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await submit();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
