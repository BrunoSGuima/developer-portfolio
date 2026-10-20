import { Link } from 'react-router';
import ButtonLink from '../../components/ButtonLink/ButtonLink.tsx';
import { home } from '../../content/profile.ts';
import { useLocale, useLocalizedPath, useMessages } from '../../i18n/context.ts';
import { pick } from '../../i18n/localized.ts';
import page from '../Page.module.css';
import styles from './HomePage.module.css';

function HomePage() {
  const locale = useLocale();
  const messages = useMessages();
  const to = useLocalizedPath();

  return (
    <>
      {/* The hero and "What I do" share one grid from 64rem (see .top). */}
      <div className={styles.top}>
        {/* From 64rem up, the shell's Fun Fact scene sits to the right of this block. */}
        <div className={styles.hero} data-slot="hero">
          <h1>{messages.home.heading}</h1>
          <p className={page.lead}>{pick(home.lead, locale)}</p>
          <div className={styles.actions}>
            <ButtonLink to={to('/projects')}>
              {messages.home.viewProjects} <span aria-hidden="true">→</span>
            </ButtonLink>
            <ButtonLink to={to('/about')} variant="secondary">
              {messages.home.aboutMe}
            </ButtonLink>
          </div>
        </div>

        <section className={`${page.section} ${styles.whatIDo}`} aria-labelledby="what-i-do">
          <h2 id="what-i-do">{messages.home.whatIDo}</h2>
          <ul className={`${page.cardGrid} ${styles.threeUp}`}>
            {home.whatIDo.map((item) => (
              <li key={item.title.en} className={page.card}>
                <h3>{pick(item.title, locale)}</h3>
                <p>{pick(item.text, locale)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={page.section} aria-labelledby="now-learning">
        <h2 id="now-learning">{messages.home.nowLearning}</h2>
        <p>{pick(home.nowLearning, locale)}</p>
      </section>

      <section className={page.section} aria-labelledby="this-site">
        <h2 id="this-site">{messages.home.thisSite}</h2>
        <p>{pick(home.thisSite, locale)}</p>
        <p className={styles.more}>
          <Link to={to('/architecture')}>
            {messages.home.exploreArchitecture} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>
    </>
  );
}

export default HomePage;
