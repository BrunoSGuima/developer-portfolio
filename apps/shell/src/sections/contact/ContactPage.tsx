import { contact } from '../../content/contact.ts';
import page from '../Page.module.css';
import styles from './ContactPage.module.css';

function ContactPage() {
  return (
    <>
      <h1>Contact</h1>
      <p className={page.lead}>{contact.lead}</p>
      <dl className={`${page.section} ${styles.channels}`}>
        {contact.channels.map((channel) => (
          <div key={channel.label}>
            <dt>{channel.label}</dt>
            <dd>
              <a href={channel.href}>{channel.display}</a>
            </dd>
          </div>
        ))}
        <div>
          <dt>Location</dt>
          <dd>{contact.location}</dd>
        </div>
      </dl>
      <p className={page.note}>{contact.availability}</p>
    </>
  );
}

export default ContactPage;
