/**
 * Interface strings (navigation, buttons, headings, accessibility labels, status words). The
 * English dictionary defines the shape: every other language must provide exactly these keys
 * (`Messages`), so a missing or extra string fails the type check. Page content (profile,
 * experience, projects, …) lives in `content/` as `Localized` fields instead.
 */
export const en = {
  site: {
    title: 'Bruno Guimarães — Full-Stack Software Engineer',
  },
  layout: {
    skipLink: 'Skip to content',
    mainNav: 'Main',
    menu: 'Menu',
    languageNav: 'Language',
  },
  funFact: {
    region: 'Fun fact',
    label: 'Fun Fact',
    technologies: 'Technologies',
  },
  tech: {
    planned: 'planned',
  },
  status: {
    done: 'Done',
    live: 'Live',
    'in-progress': 'In progress',
    planned: 'Planned',
  },
  placeholder: {
    toConfirm: 'To confirm',
  },
  projectCard: {
    technologies: 'Technologies',
    links: 'Links',
  },
  home: {
    heading: "Hi, I'm Bruno.",
    viewProjects: 'View Projects',
    aboutMe: 'About Me',
    whatIDo: 'What I do',
    nowLearning: 'Now learning',
    thisSite: 'This site is a project, too',
    exploreArchitecture: 'Explore the architecture',
  },
  about: {
    experience: 'Experience',
    skills: 'Skills',
    skillsProfessional: 'Professional experience',
    skillsDeveloping: 'Currently developing',
    education: 'Education',
    languages: 'Languages',
    background: 'Background',
  },
  projects: {
    leadBeforeLink:
      "Things I've built in public. Most of my professional work lives in private client codebases, so it isn't shown here; my experience is summarised on the",
    leadLink: 'About',
    /** Follows the link directly, so it carries its own leading space where needed. */
    leadAfterLink: ' page.',
    note: 'More public projects will be added as this portfolio grows.',
  },
  architecture: {
    leadBeforeStatus:
      "This portfolio is a learning project as much as a showcase. Here's how it's built today, and where it's going. Anything marked",
    leadAfterStatus: "doesn't exist yet.",
    builtToday: "How it's built today",
    evolution: 'How it will evolve',
    timelineNote:
      'The Rails API (v2) is built and tested on its own; the pages are not connected to it yet, which is the next step (v3). Deployment comes after that integration. The order of the later steps (v5–v8) is provisional.',
    decisions: 'Key decisions',
  },
  contact: {
    location: 'Location',
  },
  notFound: {
    title: 'Page not found',
    text: 'There is nothing at this address.',
    home: 'Back to home',
    description: 'This page does not exist on Bruno Guimarães’s portfolio.',
  },
  remote: {
    loading: 'Loading section…',
  },
  error: {
    title: 'Something went wrong',
    text: 'This section could not be loaded. Please try again.',
    reload: 'Reload the page',
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** The shape every language's dictionary must match. */
export type Messages = Widen<typeof en>;
