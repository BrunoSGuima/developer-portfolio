import type { ActionFunctionArgs } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactAction, staticContactAction } from './action.ts';

// Tests run as a static build (VITE_APP_MODE unset): no form, no API client, no request.
const loaded = vi.hoisted(() => ({ api: false, submit: false }));
vi.mock('../api/contact.ts', () => {
  loaded.api = true;
  return {};
});
vi.mock('./submit.ts', () => {
  loaded.submit = true;
  return {};
});

const fetchSpy = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchSpy);
afterEach(() => fetchSpy.mockReset());

describe('contactAction, static build', () => {
  it('is the static action, which refuses any submission without a request', () => {
    expect(contactAction).toBe(staticContactAction);

    const request = new Request('http://localhost/contact', { method: 'POST' });
    expect(() => contactAction({ request, params: {}, context: {} } as ActionFunctionArgs)).toThrow(
      'no contact form',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(loaded).toEqual({ api: false, submit: false });
  });
});
