import { isPlaceholder } from '../../content/placeholder.ts';
import type { Project } from '../../content/projects.ts';
import { useLocale, useMessages } from '../../i18n/context.ts';
import { pick } from '../../i18n/localized.ts';
import { Placeholder } from '../Placeholder/Placeholder.tsx';
import StatusTag from '../StatusTag/StatusTag.tsx';
import TechBadge from '../TechBadge/TechBadge.tsx';
import styles from './ProjectCard.module.css';

function ProjectCard({ project }: { project: Project }) {
  const locale = useLocale();
  const messages = useMessages();
  const headingId = `project-${project.id}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.name}>
          {pick(project.name, locale)}
        </h2>
        <StatusTag status={project.status} />
      </div>
      <p>{pick(project.description, locale)}</p>
      <ul aria-label={messages.projectCard.technologies} className={styles.badges}>
        {project.tech.map((tech) => (
          <li key={tech}>
            <TechBadge tech={tech} />
          </li>
        ))}
      </ul>
      <ul aria-label={messages.projectCard.links} className={styles.links}>
        {project.links.map((link) => {
          const label = pick(link.label, locale);
          return (
            <li key={label}>
              {isPlaceholder(link.href) ? (
                <>
                  {label}: <Placeholder placeholder={link.href} />
                </>
              ) : (
                <a href={link.href}>{label}</a>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default ProjectCard;
