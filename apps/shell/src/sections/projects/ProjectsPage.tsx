import { Link } from 'react-router';
import PageIntro from '../../components/PageIntro/PageIntro.tsx';
import ProjectCard from '../../components/ProjectCard/ProjectCard.tsx';
import { projects } from '../../content/projects.ts';
import { useLocale, useLocalizedPath, useMessages } from '../../i18n/context.ts';
import page from '../Page.module.css';
import { sectionTitle } from '../registry.ts';
import styles from './ProjectsPage.module.css';

function ProjectsPage() {
  const locale = useLocale();
  const messages = useMessages();
  const to = useLocalizedPath();

  return (
    <PageIntro
      title={sectionTitle('projects', locale)}
      lead={
        <>
          {messages.projects.leadBeforeLink}{' '}
          <Link to={to('/about')} viewTransition>
            {messages.projects.leadLink}
          </Link>
          {messages.projects.leadAfterLink}
        </>
      }
      column={
        <>
          <ul className={`${page.cardGridFit} ${styles.cards}`}>
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
          <p className={page.note}>{messages.projects.note}</p>
        </>
      }
    />
  );
}

export default ProjectsPage;
