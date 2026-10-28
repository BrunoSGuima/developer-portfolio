import PageIntro from '../../components/PageIntro/PageIntro.tsx';
import StatusTag from '../../components/StatusTag/StatusTag.tsx';
import { appMode } from '../../config/mode.ts';
import { components, decisions, runModes, timeline } from '../../content/architecture.ts';
import { useLocale, useMessages } from '../../i18n/context.ts';
import { pick, text } from '../../i18n/localized.ts';
import page from '../Page.module.css';
import { sectionTitle } from '../registry.ts';
import styles from './ArchitecturePage.module.css';

function ArchitecturePage() {
  const locale = useLocale();
  const messages = useMessages();

  return (
    <PageIntro
      title={sectionTitle('architecture', locale)}
      lead={
        <>
          {messages.architecture.leadBeforeStatus} <strong>{messages.status.planned}</strong>{' '}
          {messages.architecture.leadAfterStatus}
        </>
      }
      column={
        <section
          className={`${page.section} ${styles.builtTodaySection}`}
          aria-labelledby="built-today"
        >
          <h2 id="built-today">{messages.architecture.builtToday}</h2>
          <ul className={`${page.cardGridFit} ${styles.builtToday}`}>
            {components.map((component) => (
              <li key={component.id} className={`${page.card} ${page.cardCompact}`}>
                <div className={styles.componentHeader}>
                  <h3>{text(component.name, locale)}</h3>
                  <StatusTag status={component.status} />
                </div>
                <p>{pick(component.description, locale)}</p>
              </li>
            ))}
          </ul>
        </section>
      }
    >
      <section className={page.section} aria-labelledby="run-modes">
        <h2 id="run-modes">{messages.architecture.modes}</h2>
        <ul className={`${page.cardGridFit} ${styles.modes}`}>
          {runModes.map((mode) => (
            <li key={mode.id} className={page.card} data-run-mode={mode.id}>
              <h3>{pick(mode.name, locale)}</h3>
              <p className={styles.role}>{pick(mode.role, locale)}</p>
              <ul className={styles.points}>
                {mode.points.map((point) => (
                  <li key={point.en}>{pick(point, locale)}</li>
                ))}
              </ul>
              {mode.hosting && (
                <p className={styles.hosting}>
                  <span>
                    {messages.architecture.hosting}: {text(mode.hosting.name, locale)}
                  </span>
                  <StatusTag status={mode.hosting.status} />
                </p>
              )}
              {mode.note && <p className={page.note}>{pick(mode.note, locale)}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="evolution">
        <h2 id="evolution">{messages.architecture.evolution}</h2>
        <ol className={`${page.cardGridFit} ${styles.timeline}`}>
          {timeline.map((milestone) => (
            <li key={milestone.id}>
              <span className={styles.version}>{milestone.version}</span>
              <span className={styles.milestone}>{pick(milestone.name, locale)}</span>
              <StatusTag status={milestone.status} />
            </li>
          ))}
        </ol>
        <p className={page.note}>{messages.architecture.timelineNote[appMode]}</p>
      </section>

      <section className={page.section} aria-labelledby="decisions">
        <h2 id="decisions">{messages.architecture.decisions}</h2>
        <ul className={`${page.cardGridFit} ${styles.decisions}`}>
          {decisions.map((decision) => (
            <li key={decision.id}>
              <strong>
                {decision.id}: {pick(decision.title, locale)}
              </strong>
              <span>{pick(decision.summary, locale)}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageIntro>
  );
}

export default ArchitecturePage;
