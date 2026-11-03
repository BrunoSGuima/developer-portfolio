import { isPlaceholder } from '../../content/placeholder.ts';
import { projectDisplay } from '../../content/projectDisplay.ts';
import type { Project } from '../../projects/model.ts';
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
  const display = projectDisplay[project.id];

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.name}>
          {pick(project.name, locale)}
        </h2>
        <StatusTag
          status={project.status}
          {...(display ? { label: pick(display.statusLabel, locale) } : {})}
        />
      </div>
      {display && <p className={styles.category}>{pick(display.category, locale)}</p>}
      <p>{pick(project.description, locale)}</p>
      <ul aria-label={messages.projectCard.technologies} className={styles.badges}>
        {project.tech.map((tech) => (
          <li key={tech}>
            <TechBadge tech={tech} />
          </li>
        ))}
      </ul>
      {/* A project in a private repository has no links: no empty list either. */}
      {project.links.length > 0 && (
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
      )}
    </article>
  );
}

export default ProjectCard;
