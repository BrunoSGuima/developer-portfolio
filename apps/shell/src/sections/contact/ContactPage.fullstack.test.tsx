import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { contactMessageAccepted, errorResponse } from '../../api/fixtures.ts';
import { clearDraft } from '../../contact/draft.ts';
import { renderRoute, ROUTE_WAIT } from '../../test/renderRoute.tsx';

// The Contact page through the real routes and action, as built in full-stack mode. fetch is
// stubbed, so every API answer is controlled and no request leaves the test.
vi.mock('../../config/mode.ts', () => ({
  APP_MODES: ['static', 'fullstack'],
  appMode: 'fullstack',
  isFullStack: true,
}));
vi.stubEnv('VITE_APP_MODE', 'fullstack');

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

/** A response the test releases when it wants. */
function held() {
  let release!: (response: Response) => void;
  fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (release = resolve)));
  return (response: Response) =>
    act(async () => {
      release(response);
      await Promise.resolve();
    });
}

// The page and form are lazy chunks. Loading them once here keeps Vite's first transform of
// these modules (test setup, not app behaviour) out of the first test's findBy window.
beforeAll(async () => {
  await import('./ContactPage.tsx');
  await import('./ContactForm.tsx');
});

beforeEach(() => clearDraft());
afterEach(() => fetchMock.mockReset());

async function renderContact(path = '/contact') {
  const rendered = renderRoute(path);
  await screen.findByRole('heading', { level: 2 }, ROUTE_WAIT);
  return rendered;
}

async function fill(user: ReturnType<typeof renderRoute>['user']) {
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Message'), 'Hello, shall we talk about a role?');
}

const send = () => screen.getByRole('button', { name: /Send message|Sending/ });
const statusRegion = () => document.querySelector('[data-contact-status]')!;
const alertRegion = () => document.querySelector('[data-contact-alert]')!;

describe('ContactPage, full-stack build', () => {
  it('keeps the channels and adds a labelled form with autocomplete', async () => {
    await renderContact();

    expect(screen.getByRole('link', { name: /linkedin\.com/ })).toBeInTheDocument();
    const form = screen.getByRole('region', { name: 'Send a message' });
    expect(within(form).getByLabelText('Name')).toHaveAttribute('autocomplete', 'name');
    expect(within(form).getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(within(form).getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(within(form).getByLabelText('Message')).toHaveAccessibleDescription(
      'Between 10 and 5,000 characters.',
    );
    for (const field of ['Name', 'Email', 'Message']) {
      expect(within(form).getByLabelText(field)).toBeRequired();
    }
    expect(form).toHaveTextContent(/deleted within 12 months under my retention policy/);
  });

  it('hides the honeypot from people, assistive technology, the keyboard and autofill', async () => {
    await renderContact();

    const trap = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('autocomplete', 'off');
    expect(screen.queryByRole('textbox', { name: /Leave this field empty/ })).toBeNull();
  });

  it('shows the full-stack Fun Fact, with the Rails and PostgreSQL badges', async () => {
    await renderContact();

    const funFact = screen.getByRole('complementary', { name: 'Fun fact' });
    expect(funFact).toHaveTextContent(/React Router action to a Ruby on Rails API/);
    const badges = within(funFact).getByRole('list', { name: 'Technologies' });
    expect(within(badges).getByText('PostgreSQL')).toBeInTheDocument();
  });

  it('checks the fields before sending, focusing the first invalid one', async () => {
    const { user } = await renderContact();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(send());

    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter your name.');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter an email address like name@example.com.',
    );
    expect(screen.getByLabelText('Message')).toHaveAccessibleDescription(
      'Between 10 and 5,000 characters. Enter your message.',
    );
    expect(fetchMock).not.toHaveBeenCalled();

    // Corrected as it's typed.
    await user.type(screen.getByLabelText('Name'), 'Ada');
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  // Render, typing three fields and a submit: a test budget above Vitest's 5 s default under load.
  it('sends, then confirms with focus on the message and clears the form', async () => {
    fetchMock.mockResolvedValue(json(contactMessageAccepted, 202));
    const { user } = await renderContact();

    await fill(user);
    await user.click(send());

    const status = await screen.findByText(
      "Thank you, your message was sent. I'll reply by email.",
      undefined,
      ROUTE_WAIT,
    );
    expect(statusRegion()).toContainElement(status);
    expect(statusRegion()).toHaveAttribute('role', 'status');
    // Focus moves in an effect after the confirmation renders.
    await waitFor(() => expect(statusRegion()).toHaveFocus());
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Message')).toHaveValue('');
    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello, shall we talk about a role?',
      locale: 'en',
      website: '',
    });

    // A new message hides the confirmation.
    await user.type(screen.getByLabelText('Name'), 'B');
    expect(statusRegion()).toBeEmptyDOMElement();
  }, 20_000);

  it('sends once while pending, however often Send is pressed', async () => {
    const release = held();
    const { user } = await renderContact();
    await fill(user);

    await user.click(send());
    await user.click(send());
    await user.keyboard('{Enter}');

    expect(send()).toHaveTextContent('Sending…');
    expect(send()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Name')).toHaveAttribute('readonly');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await release(json(contactMessageAccepted, 202));
    expect(
      await screen.findByRole('button', { name: 'Send message' }, ROUTE_WAIT),
    ).not.toHaveAttribute('aria-disabled');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks a second submit synchronously, before the fetcher state changes', async () => {
    const release = held();
    const { user } = await renderContact();
    await fill(user);
    const form = send().closest('form')!;

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await screen.findByRole('button', { name: 'Sending…' }, ROUTE_WAIT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await release(json(contactMessageAccepted, 202));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the API's field errors inline, keeping what was typed", async () => {
    fetchMock.mockResolvedValue(
      json(errorResponse('validation_failed', 'x', { email: ['invalid'] }), 422),
    );
    const { user } = await renderContact();
    await fill(user);

    await user.click(send());

    expect(
      await screen.findByText(
        'Enter an email address like name@example.com.',
        undefined,
        ROUTE_WAIT,
      ),
    ).toBeVisible();
    // The errors render with the result; focus moves once the submission is idle again (after
    // React Router's revalidation), so wait for it rather than assume the same tick.
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
    expect(screen.getByLabelText('Message')).toHaveValue('Hello, shall we talk about a role?');
  });

  it('explains a failed connection without claiming the message was lost, keeping the text', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { user } = await renderContact();
    await fill(user);

    await user.click(send());

    await waitFor(
      () =>
        expect(alertRegion()).toHaveTextContent(
          /may or may not have arrived\. Your text is still here/,
        ),
      ROUTE_WAIT,
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(send()).not.toHaveAttribute('aria-disabled');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports an unexpected failure, keeping the text', async () => {
    fetchMock.mockResolvedValue(
      json(errorResponse('internal_error', 'Internal Server Error'), 500),
    );
    const { user } = await renderContact();
    await fill(user);

    await user.click(send());

    await waitFor(
      () => expect(alertRegion()).toHaveTextContent("Your message couldn't be sent right now."),
      ROUTE_WAIT,
    );
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
  });

  it.each([
    ['/contact', '3600', 'Please try again in 1 hour, or email me.'],
    ['/pt-br/contact', '3600', 'Tente novamente em 1 hora, ou me mande um e-mail.'],
    ['/contact', '90', 'Please try again in 2 minutes, or email me.'],
  ])('reports the rate limit on %s with Retry-After %s', async (path, seconds, expected) => {
    fetchMock.mockResolvedValue(
      json(errorResponse('rate_limited', 'Too many'), 429, { 'Retry-After': seconds }),
    );
    const { user } = await renderContact(path);
    await user.type(screen.getByRole('textbox', { name: /Name|Nome/ }), 'Ada Lovelace');
    await user.type(screen.getByRole('textbox', { name: /Email|E-mail/ }), 'ada@example.com');
    await user.type(
      screen.getByRole('textbox', { name: /Message|Mensagem/ }),
      'Hello, shall we talk?',
    );

    await user.click(screen.getByRole('button', { name: /Send message|Enviar mensagem/ }));

    await waitFor(() => expect(alertRegion()).toHaveTextContent(expected), ROUTE_WAIT);
    expect(alertRegion()).toHaveAttribute('role', 'alert');
  });

  it('keeps the draft across a language switch', async () => {
    const { user, router } = await renderContact();
    await fill(user);

    await act(() => router.navigate('/pt-br/contact'));

    expect(await screen.findByRole('textbox', { name: 'Nome' }, ROUTE_WAIT)).toHaveValue(
      'Ada Lovelace',
    );
    expect(screen.getByRole('textbox', { name: 'Mensagem' })).toHaveValue(
      'Hello, shall we talk about a role?',
    );
  });

  it('keeps a submission in flight across a language switch, sending once, and confirms it in the new language', async () => {
    const release = held();
    const { user, router } = await renderContact();
    await fill(user);
    await user.click(send());

    await act(() => router.navigate('/pt-br/contact'));
    const sending = await screen.findByRole('button', { name: 'Enviando…' }, ROUTE_WAIT);
    expect(sending).toHaveAttribute('aria-disabled', 'true');
    await user.click(sending);

    await release(json(contactMessageAccepted, 202));

    expect(
      await screen.findByText(
        'Obrigado, sua mensagem foi enviada. Vou responder por e-mail.',
        undefined,
        ROUTE_WAIT,
      ),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toMatchObject({
      locale: 'en',
    });
  });

  it('shows a failure again, localised, after a language switch', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { user, router } = await renderContact();
    await fill(user);
    await user.click(send());
    await waitFor(() => expect(alertRegion()).not.toBeEmptyDOMElement(), ROUTE_WAIT);

    await act(() => router.navigate('/pt-br/contact'));

    expect(await screen.findByText(/pode ou não ter chegado/, undefined, ROUTE_WAIT)).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveValue('ada@example.com');
  });
});
