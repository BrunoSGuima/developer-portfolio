import { lazy, Suspense } from 'react';
import { contact } from '../../content/contact.ts';
import { useLocale, useMessages } from '../../i18n/context.ts';
import { pick } from '../../i18n/localized.ts';
import page from '../Page.module.css';
import { sectionTitle } from '../registry.ts';
import styles from './ContactPage.module.css';

// The literal comparison (the same one as config/mode.ts) must stay at the import site: a static
// build drops the import, so it contains none of the form's code (static-mode E2E checks).
const ContactForm =
  import.meta.env.VITE_APP_MODE === 'fullstack' ? lazy(() => import('./ContactForm.tsx')) : null;

/**
 * The ways to reach me, in both modes. A full-stack build adds the contact form, which sends
 * through the Rails API; a static build has no form and makes no request (ADR-0014).
 */
function ContactPage() {
  const locale = useLocale();
  const messages = useMessages();

  return (
    <>
      <h1>{sectionTitle('contact', locale)}</h1>
      <p className={page.lead}>{pick(contact.lead, locale)}</p>
      <dl className={`${page.section} ${styles.channels}`}>
        {contact.channels.map((channel) => (
          <div key={channel.href}>
            <dt>{pick(channel.label, locale)}</dt>
            <dd>
              <a href={channel.href}>{channel.display}</a>
            </dd>
          </div>
        ))}
        <div>
          <dt>{messages.contact.location}</dt>
          <dd>{pick(contact.location, locale)}</dd>
        </div>
      </dl>
      <p className={page.note}>{pick(contact.availability, locale)}</p>
      {ContactForm && (
        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      )}
    </>
  );
}

export default ContactPage;
