import { ApiError, postJson } from './client.ts';
import type { ApiContactMessageAccepted, ApiContactMessageRequest } from './types.ts';

/**
 * Sends a contact message (full-stack mode, ADR-0014): POST /api/v1/contact_messages. Resolves
 * when the API has accepted it (202); every failure is an ApiError, which contact/action.ts turns
 * into the form's result. The request body is never logged or kept.
 */
export async function sendContactMessage(
  message: ApiContactMessageRequest,
  { signal }: { signal?: AbortSignal } = {},
): Promise<void> {
  const body = await postJson<ApiContactMessageAccepted>('/api/v1/contact_messages', message, {
    signal,
  });
  if (body.data?.status !== 'received') {
    throw new ApiError('invalid_response', 'The API returned an unexpected contact response', {
      status: 202,
    });
  }
}
