import { Text } from '../../components/Placeholder/Placeholder.tsx';
import { education, formatPeriod } from '../../content/education.ts';
import { experience, formatYearMonth } from '../../content/experience.ts';
import { about, developingSkills, languages, professionalSkills } from '../../content/profile.ts';
import page from '../Page.module.css';
import styles from './AboutPage.module.css';

function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <p className={page.lead}>{about.lead}</p>

      <section className={page.section} aria-labelledby="experience">
        <h2 id="experience">Experience</h2>
        <ol className={`${page.cardGridFit} ${styles.timeline}`}>
          {experience.map((job) => (
            <li key={`${job.company}-${job.start}`}>
              <article className={styles.job} aria-label={`${job.role}, ${job.company}`}>
                <h3>{job.role}</h3>
                <p className={styles.meta}>
                  {job.company} <span aria-hidden="true">·</span>{' '}
                  <time dateTime={job.start}>{formatYearMonth(job.start)}</time> –{' '}
                  <time dateTime={job.end}>{formatYearMonth(job.end)}</time>
                </p>
                <p>{job.summary}</p>
              </article>
            </li>
          ))}
        </ol>
        <p className={page.note}>{about.careerNote}</p>
      </section>

      <section className={page.section} aria-labelledby="skills">
        <h2 id="skills">Skills</h2>
        <div className={styles.skills}>
          <section aria-labelledby="skills-professional">
            <h3 id="skills-professional">Professional experience</h3>
            <dl className={styles.skillList}>
              {professionalSkills.map((group) => (
                <div key={group.label}>
                  <dt>{group.label}</dt>
                  <dd>{group.items.join(', ')}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="skills-developing">
            <h3 id="skills-developing">Currently developing</h3>
            <ul className={styles.developing}>
              {developingSkills.map((skill) => (
                <li key={skill.name}>
                  <strong>{skill.name}</strong> ({skill.note})
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section className={page.section} aria-labelledby="education">
        <h2 id="education">Education</h2>
        <ul className={styles.education}>
          {education.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <span className={styles.meta}>
                {item.institution} · {formatPeriod(item)}
              </span>
              {item.note && <span>{item.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="languages">
        <h2 id="languages">Languages</h2>
        <ul className={styles.languages}>
          {languages.map((item) => (
            <li key={item.language}>
              <strong>{item.language}</strong>: {item.level}
            </li>
          ))}
        </ul>
      </section>

      <section className={page.section} aria-labelledby="background">
        <h2 id="background">Background</h2>
        <p>
          {about.background} <Text value={about.backgroundDetail} />
        </p>
        <p className={styles.resume}>
          <a href={about.resume.href} download>
            {about.resume.label}
          </a>
        </p>
      </section>
    </>
  );
}

export default AboutPage;
