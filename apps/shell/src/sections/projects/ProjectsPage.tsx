import { Suspense, useRef } from 'react';
import { Await, Link, useLoaderData, useRevalidator } from 'react-router';
import buttonStyles from '../../components/ButtonLink/ButtonLink.module.css';
import PageIntro from '../../components/PageIntro/PageIntro.tsx';
import ProjectCard from '../../components/ProjectCard/ProjectCard.tsx';
import { useLocale, useLocalizedPath, useMessages } from '../../i18n/context.ts';
import type { Project } from '../../projects/model.ts';
import { invalidateProjects, type ProjectsData } from '../../projects/source.ts';
import page from '../Page.module.css';
import { sectionTitle } from '../registry.ts';
import styles from './ProjectsPage.module.css';

/**
 * The projects come from the route's loader (projects/source.ts): the static data in a static
 * build, the Rails API in a full-stack build. The same cards render either way; while the API
 * answers, the page shows a loading state, and if it fails, an error with a retry (never the
 * static data).
 */
function ProjectsPage() {
  const locale = useLocale();
  const messages = useMessages();
  const to = useLocalizedPath();
  const { projects } = useLoaderData<ProjectsData>();
  const revalidator = useRevalidator();
  const region = useRef<HTMLDivElement>(null);

  // Retry always makes a fresh request, whatever is cached, and keeps focus in the list's
  // region while it reloads (the error message and its button are replaced).
  const retry = () => {
    invalidateProjects();
    region.current?.focus();
    void revalidator.revalidate();
  };

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
          <div ref={region} tabIndex={-1} className={styles.region} data-projects>
            <Suspense fallback={<ProjectsLoading />}>
              <Await resolve={projects} errorElement={<ProjectsError onRetry={retry} />}>
                {(list: readonly Project[]) => <ProjectList projects={list} />}
              </Await>
            </Suspense>
          </div>
          <p className={page.note}>{messages.projects.note}</p>
        </>
      }
    />
  );
}

function ProjectList({ projects }: { projects: readonly Project[] }) {
  const messages = useMessages();

  if (projects.length === 0) {
    return <p className={styles.state}>{messages.projects.empty}</p>;
  }
  return (
    <ul className={`${page.cardGridFit} ${styles.cards}`}>
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}

function ProjectsLoading() {
  const messages = useMessages();

  return (
    <div className={styles.state} role="status" aria-busy="true">
      <p>{messages.projects.loading}</p>
    </div>
  );
}

function ProjectsError({ onRetry }: { onRetry: () => void }) {
  const messages = useMessages();

  return (
    <div className={styles.state} role="alert">
      <p>{messages.projects.error}</p>
      <button
        type="button"
        className={buttonStyles.button}
        data-variant="primary"
        onClick={onRetry}
      >
        {messages.projects.retry}
      </button>
    </div>
  );
}

export default ProjectsPage;
