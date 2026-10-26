import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getJson, postJson } from './client.ts';
import { errorResponse, projectListResponse } from './fixtures.ts';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('expected the request to fail');
}

vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

describe('API client requests', () => {
  it('GETs a same-origin, relative path asking for JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(projectListResponse));
    const controller = new AbortController();

    await expect(getJson('/api/v1/projects', { signal: controller.signal })).resolves.toEqual(
      projectListResponse,
    );

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/projects');
    expect(init).toMatchObject({ method: 'GET', headers: { Accept: 'application/json' } });
    expect(init?.signal).toBe(controller.signal);
    expect(init?.credentials).toBeUndefined();
  });

  it('POSTs a JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { status: 'received' } }, 202));

    await expect(postJson('/api/v1/contact_messages', { name: 'Ada' })).resolves.toEqual({
      data: { status: 'received' },
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/contact_messages');
    expect(init).toMatchObject({
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{"name":"Ada"}',
    });
  });
});

describe('API client errors', () => {
  it('keeps the API error envelope: status, code and message (404)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(errorResponse('not_found', 'Project not found'), 404));

    const error = await failure(getJson('/api/v1/projects/nope'));

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'not_found',
      message: 'Project not found',
      details: {},
      retryAfter: null,
    });
  });

  it('keeps per-field details (422)', async () => {
    const details = { email: ['invalid'], message: ['too_short'] };
    fetchMock.mockResolvedValue(
      jsonResponse(
        errorResponse('validation_failed', 'The message could not be sent', details),
        422,
      ),
    );

    const error = await failure(postJson('/api/v1/contact_messages', {}));

    expect(error).toMatchObject({ status: 422, code: 'validation_failed', details });
  });

  it('reads Retry-After in seconds (429)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(errorResponse('rate_limited', 'Too many messages'), 429, {
        'Retry-After': '3600',
      }),
    );

    const error = await failure(postJson('/api/v1/contact_messages', {}));

    expect(error).toMatchObject({ status: 429, code: 'rate_limited', retryAfter: 3600 });
  });

  it.each([
    [405, 'method_not_allowed'],
    [500, 'internal_error'],
  ] as const)('maps an enveloped %i to %s', async (status, code) => {
    fetchMock.mockResolvedValue(jsonResponse(errorResponse(code, 'message'), status));

    await expect(failure(getJson('/api/v1/projects'))).resolves.toMatchObject({ status, code });
  });

  it('treats a non-JSON error (a proxy page when the API is down) as an invalid response', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await expect(failure(getJson('/api/v1/projects'))).resolves.toMatchObject({
      status: 502,
      code: 'invalid_response',
    });
  });

  it('treats JSON without the error envelope as an invalid response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 500));

    await expect(failure(getJson('/api/v1/projects'))).resolves.toMatchObject({
      status: 500,
      code: 'invalid_response',
    });
  });

  it.each([
    [
      'a non-JSON success',
      new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    ],
    [
      'unparsable JSON',
      new Response('{oops', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ],
  ])('treats %s as an invalid response', async (_, response) => {
    fetchMock.mockResolvedValue(response);

    await expect(failure(getJson('/api/v1/projects'))).resolves.toMatchObject({
      status: 200,
      code: 'invalid_response',
    });
  });

  it('reports a network failure, keeping its cause', async () => {
    const cause = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(cause);

    const error = await failure(getJson('/api/v1/projects'));

    expect(error).toMatchObject({ status: null, code: 'network', cause });
  });

  it('reports an abort before the request', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockImplementation((_url, init) => Promise.reject(init?.signal?.reason as Error));

    const error = await failure(getJson('/api/v1/projects', { signal: controller.signal }));

    expect(error).toMatchObject({ status: null, code: 'aborted' });
    expect(error.cause).toBe(controller.signal.reason);
  });

  it('reports an abort during the request', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
        }),
    );

    const pending = failure(getJson('/api/v1/projects', { signal: controller.signal }));
    controller.abort();

    await expect(pending).resolves.toMatchObject({ code: 'aborted' });
  });
});
