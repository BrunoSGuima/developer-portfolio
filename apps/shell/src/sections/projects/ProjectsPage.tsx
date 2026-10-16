import { Link } from 'react-router';
import ProjectCard from '../../components/ProjectCard/ProjectCard.tsx';
import { projects } from '../../content/projects.ts';
import page from '../Page.module.css';

function ProjectsPage() {
  return (
    <>
      <h1>Projects</h1>
      <p className={page.lead}>
        Things I&apos;ve built in public. Most of my professional work lives in private client
        codebases, so it isn&apos;t shown here; my experience is summarised on the{' '}
        <Link to="/about">About</Link> page.
      </p>
      <ul className={`${page.cardGrid} ${page.section}`}>
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
      <p className={page.note}>More public projects will be added as this portfolio grows.</p>
    </>
  );
}

export default ProjectsPage;
