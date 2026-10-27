import { type ChangeEvent, type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import buttonStyles from '../../components/ButtonLink/ButtonLink.module.css';
import { getDraft, saveDraft } from '../../contact/draft.ts';
import {
  CONTACT_FIELDS,
  type ContactField,
  type ContactResult,
  type ContactValues,
  emptyContactValues,
  type FieldErrors,
} from '../../contact/model.ts';
import { hasErrors, length, MESSAGE_MAX, validateContact } from '../../contact/validation.ts';
import { useLocale, useMessages } from '../../i18n/context.ts';
import type { Locale } from '../../i18n/locales.ts';
import type { Messages } from '../../i18n/messages/en.ts';
import page from '../Page.module.css';
import styles from './ContactForm.module.css';

/**
 * Every ContactForm shares this fetcher, so a submission in flight and its result survive a
 * language switch (the Portuguese route remounts the page) and are shown in the new language.
 */
export const CONTACT_FETCHER_KEY = 'contact';

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * The contact form (full-stack builds only; ContactPage renders it). It submits to the Contact
 * route's action (contact/action.ts) through a fetcher and never sees the API itself.
 *
 * - The values are checked like the API checks them before anything is sent; errors appear under
 *   each field and focus moves to the first one.
 * - One submission at a time: a ref blocks a second submit at once, before the fetcher's state
 *   changes, and the fields are read-only while sending. Nothing is ever re-sent automatically.
 * - What was typed stays after a failure (and across a language switch, contact/draft.ts) and is
 *   cleared once the API has accepted the message.
 */
function ContactForm() {
  const locale = useLocale();
  const { contact } = useMessages();
  const text = contact.form;
  const id = useId();

  const fetcher = useFetcher<ContactResult>({ key: CONTACT_FETCHER_KEY });
  const busy = fetcher.state !== 'idle';
  const result = busy ? undefined : fetcher.data;

  const [values, setValues] = useState<ContactValues>(getDraft);
  const [errors, setErrors] = useState<FieldErrors>(() =>
    result?.status === 'invalid' ? result.errors : {},
  );
  // A success message is hidden again once the visitor starts a new message.
  const [dismissed, setDismissed] = useState<ContactResult>();

  const sending = useRef(false);
  const fields = useRef<Partial<Record<ContactField, FieldElement | null>>>({});
  const sentRegion = useRef<HTMLDivElement>(null);
  const previousState = useRef(fetcher.state);

  const focusFirst = (found: FieldErrors) => {
    const first = CONTACT_FIELDS.find((field) => found[field] !== undefined);
    if (first) fields.current[first]?.focus();
  };

  // A new result (not one found on mounting, e.g. after a language switch) clears the form on
  // success or shows the API's field errors: state adjusted while rendering, not in an effect.
  const [lastResult, setLastResult] = useState(fetcher.data);
  if (fetcher.data !== lastResult) {
    setLastResult(fetcher.data);
    if (fetcher.data?.status === 'sent') {
      setValues(emptyContactValues);
      setErrors({});
    } else if (fetcher.data?.status === 'invalid') {
      setErrors(fetcher.data.errors);
    }
  }

  // When a submission finishes here: allow the next one and move focus to its outcome.
  useEffect(() => {
    const was = previousState.current;
    previousState.current = fetcher.state;
    if (fetcher.state !== 'idle') return;
    sending.current = false;
    if (was === 'idle') return;

    const data = fetcher.data;
    if (data?.status === 'sent') sentRegion.current?.focus();
    else if (data?.status === 'invalid') focusFirst(data.errors);
  }, [fetcher.state, fetcher.data]);

  const onChange =
    (field: ContactField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      saveDraft(next);
      // A field already shown as invalid is checked again as it's corrected.
      if (errors[field] !== undefined) setErrors(withField(errors, field, validateContact(next)));
      if (result?.status === 'sent') setDismissed(result);
    };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (sending.current || busy) {
      event.preventDefault();
      return;
    }
    const found = validateContact(values);
    setErrors(found);
    if (hasErrors(found)) {
      event.preventDefault();
      focusFirst(found);
      return;
    }
    sending.current = true;
  };

  const sent = result?.status === 'sent' && result !== dismissed;
  const problem = result ? generalProblem(result, text, locale) : null;
  const count = new Intl.NumberFormat(locale);

  const field = (name: ContactField) => {
    const error = errors[name];
    const errorId = `${id}-${name}-error`;
    const hintId = `${id}-${name}-hint`;
    const describedBy = [name === 'message' ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(' ');
    const common = {
      id: `${id}-${name}`,
      name,
      value: values[name],
      onChange: onChange(name),
      required: true,
      readOnly: busy,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
      className: styles.input,
    } as const;

    return (
      <div className={styles.field} data-field={name}>
        <label htmlFor={common.id} className={styles.label}>
          {text[name]}
        </label>
        {name === 'message' ? (
          <>
            <textarea
              {...common}
              ref={(element) => void (fields.current.message = element)}
              rows={7}
            />
            <div className={styles.hintRow}>
              <p id={hintId} className={styles.hint}>
                {text.messageHint}
              </p>
              <p className={styles.hint} aria-hidden="true" data-contact-counter>
                {count.format(length(values.message))} / {count.format(MESSAGE_MAX)}
              </p>
            </div>
          </>
        ) : (
          <input
            {...common}
            ref={(element) => void (fields.current[name] = element)}
            {...(name === 'email'
              ? { type: 'email', autoComplete: 'email', inputMode: 'email', spellCheck: false }
              : { type: 'text', autoComplete: 'name' })}
          />
        )}
        {error && (
          <p id={errorId} className={styles.error} data-field-error={name}>
            {text.errors[name][error]}
          </p>
        )}
      </div>
    );
  };

  return (
    <section className={page.section} aria-labelledby={`${id}-heading`} data-contact-form>
      <h2 id={`${id}-heading`}>{text.heading}</h2>
      <p className={styles.intro}>{text.intro}</p>
      <fetcher.Form method="post" noValidate onSubmit={onSubmit} className={styles.form}>
        {field('name')}
        {field('email')}
        {field('message')}
        {/* A honeypot for bots (the API ignores messages that fill it): hidden from people,
            assistive technology, the keyboard and autofill. */}
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor={`${id}-website`}>{text.honeypot}</label>
          <input
            id={`${id}-website`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>
        <div>
          <button
            type="submit"
            className={buttonStyles.button}
            data-variant="primary"
            aria-disabled={busy || undefined}
            data-contact-submit
          >
            {busy ? text.sending : text.submit}
          </button>
        </div>
        {/* Always rendered (filled when needed), so screen readers announce the outcome. */}
        <div className={styles.feedback}>
          <div
            ref={sentRegion}
            role="status"
            tabIndex={-1}
            className={sent ? styles.sent : undefined}
            data-contact-status
          >
            {sent && <p>{text.sent}</p>}
          </div>
          <div role="alert" className={problem ? styles.problem : undefined} data-contact-alert>
            {problem && <p>{problem}</p>}
          </div>
        </div>
      </fetcher.Form>
      <p className={styles.privacy}>{text.privacy}</p>
    </section>
  );
}

function withField(errors: FieldErrors, field: ContactField, found: FieldErrors): FieldErrors {
  const next = { ...errors };
  const error = found[field];
  if (error === undefined) delete next[field];
  else next[field] = error;
  return next;
}

/** The message for a failure that isn't about one field, if any. */
function generalProblem(
  result: ContactResult,
  text: Messages['contact']['form'],
  locale: Locale,
): string | null {
  switch (result.status) {
    case 'network':
      return text.network;
    case 'unavailable':
      return text.unavailable;
    case 'rate_limited':
      return text.rateLimited.replace('{when}', retryWhen(result.retryAfter, locale, text));
    default:
      return null;
  }
}

/** "in 1 hour" / "em 1 hora", from the API's Retry-After seconds. */
function retryWhen(
  seconds: number | null,
  locale: Locale,
  text: Messages['contact']['form'],
): string {
  if (seconds === null) return text.rateLimitedLater;
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return seconds >= 3600
    ? relative.format(Math.ceil(seconds / 3600), 'hour')
    : relative.format(Math.max(1, Math.ceil(seconds / 60)), 'minute');
}

export default ContactForm;
