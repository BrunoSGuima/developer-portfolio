import type { ApiErrorEnvelope } from './types.ts';

/**
 * A small client for the portfolio's API (ADR-0014). Requests are same-origin: paths are
 * relative (`/api/v1/...`) and the Vite dev server, `vite preview` or the production proxy
 * forwards them to Rails (ADR-0011), so there is no CORS and no base URL.
 *
 * Every failure becomes an ApiError: the API's own error envelope (ADR-0012) keeps its status,
 * code, message and details; failures the API never answered get a client-side code.
 */

export type ApiPath = `/api/v1/${string}`;

/** The contract's error codes, plus the failures that never reach (or come back from) the API. */
export type ApiErrorCode =
  ApiErrorEnvelope['error']['code'] | 'network' | 'aborted' | 'invalid_response';

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number | null;
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown>;
  /** Seconds to wait before retrying (from Retry-After), when the API says so. */
  readonly retryAfter: number | null;

  constructor(
    code: ApiErrorCode,
    message: string,
    {
      status = null,
      details = {},
      retryAfter = null,
      cause,
    }: {
      status?: number | null;
      details?: Record<string, unknown>;
      retryAfter?: number | null;
      cause?: unknown;
    } = {},
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

interface RequestOptions {
  signal?: AbortSignal | undefined;
}

export function getJson<T>(path: ApiPath, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { method: 'GET' }, options);
}

export function postJson<T>(
  path: ApiPath,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  return request<T>(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    options,
  );
}

async function request<T>(
  path: ApiPath,
  init: RequestInit,
  { signal }: RequestOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new ApiError('aborted', 'The request was cancelled', { cause: signal.reason });
    }
    throw new ApiError('network', 'The API could not be reached', { cause: error });
  }

  const body = await readJson(response, signal);

  if (response.ok) {
    if (body === undefined) {
      throw new ApiError('invalid_response', 'The API returned an unexpected response', {
        status: response.status,
      });
    }
    return body as T;
  }

  if (isErrorEnvelope(body)) {
    const { code, message, details } = body.error;
    throw new ApiError(code, message, {
      status: response.status,
      details,
      retryAfter: retryAfterSeconds(response),
    });
  }
  throw new ApiError(
    'invalid_response',
    `The API returned an unexpected ${String(response.status)} response`,
    {
      status: response.status,
    },
  );
}

/** The parsed JSON body, or undefined when the response isn't JSON (e.g. a proxy's HTML page). */
async function readJson(response: Response, signal: AbortSignal | undefined): Promise<unknown> {
  if (!response.headers.get('Content-Type')?.includes('application/json')) return undefined;
  try {
    return (await response.json()) as unknown;
  } catch {
    if (signal?.aborted) {
      throw new ApiError('aborted', 'The request was cancelled', { cause: signal.reason });
    }
    return undefined;
  }
}

function isErrorEnvelope(body: unknown): body is ApiErrorEnvelope {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'details' in error &&
    typeof error.details === 'object' &&
    error.details !== null
  );
}

function retryAfterSeconds(response: Response): number | null {
  const value = Number(response.headers.get('Retry-After'));
  return response.headers.has('Retry-After') && Number.isFinite(value) && value >= 0 ? value : null;
}
