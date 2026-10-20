import { Link } from 'react-router';
import PageIntro from '../../components/PageIntro/PageIntro.tsx';
import ProjectCard from '../../components/ProjectCard/ProjectCard.tsx';
import { projects } from '../../content/projects.ts';
import page from '../Page.module.css';
import styles from './ProjectsPage.module.css';

function ProjectsPage() {
  return (
    <PageIntro
      title="Projects"
      lead={
        <>
          Things I&apos;ve built in public. Most of my professional work lives in private client
          codebases, so it isn&apos;t shown here; my experience is summarised on the{' '}
          <Link to="/about">About</Link> page.
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
          <p className={page.note}>More public projects will be added as this portfolio grows.</p>
        </>
      }
    />
  );
}

export default ProjectsPage;
