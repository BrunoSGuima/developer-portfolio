import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client.ts';
import { sendContactMessage } from './contact.ts';
import { contactMessageAccepted, contactMessageRequest, errorResponse } from './fixtures.ts';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('sendContactMessage', () => {
  it('POSTs the flat JSON body to the contact endpoint and resolves on 202', async () => {
    fetchMock.mockResolvedValue(json(contactMessageAccepted, 202));

    await expect(sendContactMessage(contactMessageRequest)).resolves.toBeUndefined();

    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/contact_messages');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    expect(JSON.parse(init?.body as string)).toEqual(contactMessageRequest);
  });

  it('rejects a success response without the received status', async () => {
    fetchMock.mockResolvedValue(json({ data: {} }, 202));

    await expect(sendContactMessage(contactMessageRequest)).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it("passes the API's errors through as ApiError", async () => {
    fetchMock.mockResolvedValue(
      json(errorResponse('validation_failed', 'x', { email: ['invalid'] }), 422),
    );

    const error: unknown = await sendContactMessage(contactMessageRequest).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, details: { email: ['invalid'] } });
  });
});
