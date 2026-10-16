import { isPlaceholder } from '../../content/placeholder.ts';
import type { Project } from '../../content/projects.ts';
import { Placeholder } from '../Placeholder/Placeholder.tsx';
import StatusTag from '../StatusTag/StatusTag.tsx';
import TechBadge from '../TechBadge/TechBadge.tsx';
import styles from './ProjectCard.module.css';

function ProjectCard({ project }: { project: Project }) {
  const headingId = `project-${project.id}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.name}>
          {project.name}
        </h2>
        <StatusTag status={project.status} />
      </div>
      <p>{project.description}</p>
      <ul aria-label="Technologies" className={styles.badges}>
        {project.tech.map((tech) => (
          <li key={tech}>
            <TechBadge tech={tech} />
          </li>
        ))}
      </ul>
      <ul aria-label="Links" className={styles.links}>
        {project.links.map((link) => (
          <li key={link.label}>
            {isPlaceholder(link.href) ? (
              <>
                {link.label}: <Placeholder placeholder={link.href} />
              </>
            ) : (
              <a href={link.href}>{link.label}</a>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default ProjectCard;
