import { Text } from '../../components/Placeholder/Placeholder.tsx';
import { education, formatPeriod } from '../../content/education.ts';
import { experience, formatYearMonth } from '../../content/experience.ts';
import { about, developingSkills, languages, professionalSkills } from '../../content/profile.ts';
import { useLocale, useMessages } from '../../i18n/context.ts';
import { pick, text } from '../../i18n/localized.ts';
import { sectionTitle } from '../registry.ts';
import page from '../Page.module.css';
import styles from './AboutPage.module.css';

function AboutPage() {
  const locale = useLocale();
  const messages = useMessages();

  return (
    <>
      <h1>{sectionTitle('about', locale)}</h1>
      <p className={page.lead}>{pick(about.lead, locale)}</p>

      <section className={page.section} aria-labelledby="experience">
        <h2 id="experience">{messages.about.experience}</h2>
        <ol className={`${page.cardGridFit} ${styles.timeline}`}>
          {experience.map((job) => {
            const role = pick(job.role, locale);
            const company = text(job.company, locale);
            return (
              <li key={`${text(job.company, 'en')}-${job.start}`}>
                <article className={styles.job} aria-label={`${role}, ${company}`}>
                  <h3>{role}</h3>
                  <p className={styles.meta}>
                    {company} <span aria-hidden="true">·</span>{' '}
                    <time dateTime={job.start}>{formatYearMonth(job.start, locale)}</time> –{' '}
                    <time dateTime={job.end}>{formatYearMonth(job.end, locale)}</time>
                  </p>
                  <p>{pick(job.summary, locale)}</p>
                </article>
              </li>
            );
          })}
        </ol>
        <p className={page.note}>{pick(about.careerNote, locale)}</p>
      </section>

      <section className={page.section} aria-labelledby="skills">
        <h2 id="skills">{messages.about.skills}</h2>
        <div className={styles.skills}>
          <section aria-labelledby="skills-professional">
            <h3 id="skills-professional">{messages.about.skillsProfessional}</h3>
            <dl className={styles.skillList}>
              {professionalSkills.map((group) => (
                <div key={group.label.en}>
                  <dt>{pick(group.label, locale)}</dt>
                  <dd>{group.items.map((item) => text(item, locale)).join(', ')}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="skills-developing">
            <h3 id="skills-developing">{messages.about.skillsDeveloping}</h3>
            <ul className={styles.developing}>
              {developingSkills.map((skill) => (
                <li key={skill.name.en}>
                  <strong>{pick(skill.name, locale)}</strong> ({pick(skill.note, locale)})
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section className={page.section} aria-labelledby="education">
        <h2 id="education">{messages.about.education}</h2>
        <ul className={styles.education}>
          {education.map((item) => (
            <li key={text(item.title, 'en')}>
              <strong>{text(item.title, locale)}</strong>
              <span className={styles.meta}>
                {text(item.institution, locale)} · {formatPeriod(item, locale)}
              </span>
              {item.note && <span>{pick(item.note, locale)}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="languages">
        <h2 id="languages">{messages.about.languages}</h2>
        <ul className={styles.languages}>
          {languages.map((item) => (
            <li key={item.language.en}>
              <strong>{pick(item.language, locale)}</strong>: {pick(item.level, locale)}
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="background">
        <h2 id="background">{messages.about.background}</h2>
        <p>
          {pick(about.background, locale)} <Text value={pick(about.backgroundDetail, locale)} />
        </p>
        <p className={styles.resume}>
          <a href={about.resume.href} download>
            {pick(about.resume.label, locale)}
          </a>
        </p>
      </section>
    </>
  );
}

export default AboutPage;
