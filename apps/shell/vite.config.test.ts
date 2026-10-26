// @vitest-environment node
import { createServer as createHttpServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import config, { apiProxy } from './vite.config.ts';

describe('the /api proxy configuration', () => {
  it('is the same for the dev server and vite preview', () => {
    expect(config.server?.proxy).toBe(apiProxy);
    expect(config.preview?.proxy).toBe(apiProxy);
  });

  it('targets the local API by default and rewrites nothing', () => {
    const options = apiProxy['/api'];
    expect(options?.target).toBe(process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:3000');
    expect(options?.rewrite).toBeUndefined();
    expect(options?.changeOrigin).toBeUndefined();
  });
});

// A stub upstream stands in for the API, so the proxy can be checked with any response,
// including a controlled 500, without adding anything to the real API.
describe('the /api proxy, end to end through a Vite server', () => {
  let upstream: Server;
  let vite: ViteDevServer;
  let base: string;
  const received: { method: string; url: string; host: string; body: string }[] = [];

  const responses: Record<string, [number, Record<string, string>, unknown]> = {
    '/api/v1/ok': [200, { 'x-request-id': 'abc' }, { data: [] }],
    '/api/v1/missing': [
      404,
      {},
      { error: { code: 'not_found', message: 'Not found', details: {} } },
    ],
    '/api/v1/read-only': [
      405,
      { allow: 'GET, HEAD' },
      { error: { code: 'method_not_allowed', message: 'Method not allowed', details: {} } },
    ],
    '/api/v1/boom': [
      500,
      { 'x-request-id': 'boom-1' },
      { error: { code: 'internal_error', message: 'Internal Server Error', details: {} } },
    ],
  };

  beforeAll(async () => {
    upstream = createHttpServer((request: IncomingMessage, response) => {
      let body = '';
      request.on('data', (chunk: Buffer) => (body += chunk.toString()));
      request.on('end', () => {
        received.push({
          method: request.method ?? '',
          url: request.url ?? '',
          host: request.headers.host ?? '',
          body,
        });
        const [status, headers, payload] = responses[request.url ?? ''] ?? [418, {}, {}];
        response.writeHead(status, {
          'content-type': 'application/json; charset=utf-8',
          ...headers,
        });
        response.end(JSON.stringify(payload));
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const { port } = upstream.address() as AddressInfo;

    process.env['API_PROXY_TARGET'] = `http://127.0.0.1:${String(port)}`;
    vite = await createServer({
      configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
      server: { port: 0, host: '127.0.0.1' },
      logLevel: 'silent',
    });
    await vite.listen();
    base = vite.resolvedUrls?.local[0]?.replace(/\/$/, '') ?? '';
  });

  afterAll(async () => {
    delete process.env['API_PROXY_TARGET'];
    await vite.close();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  it.each([
    ['/api/v1/ok', 200],
    ['/api/v1/missing', 404],
    ['/api/v1/read-only', 405],
    ['/api/v1/boom', 500],
  ])('passes %s through with status %i, its headers and its JSON body', async (path, status) => {
    const [, headers, payload] = responses[path]!;

    const response = await fetch(`${base}${path}`);

    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    for (const [name, value] of Object.entries(headers)) {
      expect(response.headers.get(name)).toBe(value);
    }
    expect(await response.json()).toEqual(payload);
  });

  it('forwards the method, path, query and body unchanged, keeping the browser-facing Host', async () => {
    const body = JSON.stringify({ name: 'Ada' });

    await fetch(`${base}/api/v1/ok?page=2`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    const last = received.at(-1);
    expect(last).toEqual({
      method: 'POST',
      url: '/api/v1/ok?page=2',
      host: new URL(base).host,
      body,
    });
  });
});
