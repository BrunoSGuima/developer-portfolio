import PageIntro from '../../components/PageIntro/PageIntro.tsx';
import StatusTag from '../../components/StatusTag/StatusTag.tsx';
import { components, decisions, timeline } from '../../content/architecture.ts';
import page from '../Page.module.css';
import styles from './ArchitecturePage.module.css';

function ArchitecturePage() {
  return (
    <PageIntro
      title="Architecture"
      lead={
        <>
          This portfolio is a learning project as much as a showcase. Here&apos;s how it&apos;s
          built today, and where it&apos;s going. Anything marked <strong>Planned</strong>{' '}
          doesn&apos;t exist yet.
        </>
      }
      column={
        <section className={page.section} aria-labelledby="built-today">
          <h2 id="built-today">How it&apos;s built today</h2>
          <ul className={`${page.cardGridFit} ${styles.builtToday}`}>
            {components.map((component) => (
              <li key={component.id} className={`${page.card} ${page.cardCompact}`}>
                <div className={styles.componentHeader}>
                  <h3>{component.name}</h3>
                  <StatusTag status={component.status} />
                </div>
                <p>{component.description}</p>
              </li>
            ))}
          </ul>
        </section>
      }
    >
      <section className={page.section} aria-labelledby="evolution">
        <h2 id="evolution">How it will evolve</h2>
        <ol className={`${page.cardGridFit} ${styles.timeline}`}>
          {timeline.map((milestone) => (
            <li key={milestone.version}>
              <span className={styles.version}>{milestone.version}</span>
              <span className={styles.milestone}>{milestone.name}</span>
              <StatusTag status={milestone.status} />
            </li>
          ))}
        </ol>
      </section>

      <section className={page.section} aria-labelledby="decisions">
        <h2 id="decisions">Key decisions</h2>
        <ul className={`${page.cardGridFit} ${styles.decisions}`}>
          {decisions.map((decision) => (
            <li key={decision.id}>
              <strong>
                {decision.id}: {decision.title}
              </strong>
              <span>{decision.summary}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageIntro>
  );
}

export default ArchitecturePage;
