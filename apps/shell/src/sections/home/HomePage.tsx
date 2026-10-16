import { Link } from 'react-router';
import ButtonLink from '../../components/ButtonLink/ButtonLink.tsx';
import { home } from '../../content/profile.ts';
import page from '../Page.module.css';
import styles from './HomePage.module.css';

function HomePage() {
  return (
    <>
      <h1>Hi, I&apos;m Bruno.</h1>
      <p className={page.lead}>{home.lead}</p>
      <div className={styles.actions}>
        <ButtonLink to="/projects">
          View Projects <span aria-hidden="true">→</span>
        </ButtonLink>
        <ButtonLink to="/about" variant="secondary">
          About Me
        </ButtonLink>
      </div>

      <section className={page.section} aria-labelledby="what-i-do">
        <h2 id="what-i-do">What I do</h2>
        <ul className={`${page.cardGrid} ${styles.threeUp}`}>
          {home.whatIDo.map((item) => (
            <li key={item.title} className={page.card}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="now-learning">
        <h2 id="now-learning">Now learning</h2>
        <p>{home.nowLearning}</p>
      </section>

      <section className={page.section} aria-labelledby="this-site">
        <h2 id="this-site">This site is a project, too</h2>
        <p>{home.thisSite}</p>
        <p className={styles.more}>
          <Link to="/architecture">
            Explore the architecture <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>
    </>
  );
}

export default HomePage;
