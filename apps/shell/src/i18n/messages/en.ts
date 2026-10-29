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
    /** The light/dark toggle (a pressed button means the dark theme is on). */
    themeToggle: 'Dark theme',
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
    done: 'Completed',
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
    certifications: 'Certifications',
    /** Before a certification's issue date, e.g. "Issued Oct 2026". */
    issued: 'Issued',
    /** Before an expiry date, e.g. "Valid until Oct 2027". */
    validUntil: 'Valid until',
    languages: 'Languages',
    background: 'Background',
  },
  projects: {
    leadBeforeLink:
      "Things I've built, mostly in public. Most of my professional work lives in private client codebases, so it isn't shown here; my experience is summarised on the",
    leadLink: 'About',
    /** Follows the link directly, so it carries its own leading space where needed. */
    leadAfterLink: ' page.',
    note: 'More projects will be added as this portfolio grows.',
    loading: 'Loading projects…',
    empty: 'No projects to show yet.',
    error: "The projects couldn't be loaded. Check your connection and try again.",
    retry: 'Try again',
  },
  architecture: {
    leadBeforeStatus:
      "This portfolio is a learning project as much as a showcase. Here's how it's built today, and where it's going. Anything marked",
    leadAfterStatus: "doesn't exist yet.",
    builtToday: "How it's built today",
    modes: 'Two ways to run it',
    hosting: 'Hosting',
    evolution: 'How it will evolve',
    /** Depends on the build's mode (src/config/mode.ts). */
    timelineNote: {
      static:
        'The Rails API (v2) and its integration with this site (v3) are built and tested, and run locally in full-stack mode; this build is the static version, which runs without the API or a database. The public release (v4) will be this static build. The order of the later steps (v5–v8) is provisional.',
      fullstack:
        "You're running the full-stack mode: the Projects page loads from the Rails API and the contact form sends messages to it, completing the integration (v3). The public release (v4) will be the static build; this mode runs locally. The order of the later steps (v5–v8) is provisional.",
    },
    decisions: 'Key decisions',
    /** The link below the decisions to every ADR on GitHub (opens in a new tab). */
    allDecisions: 'Explore all architecture decisions on GitHub',
    opensInNewTab: '(opens in a new tab)',
  },
  contact: {
    location: 'Location',
    /** The contact form (full-stack builds only). */
    form: {
      heading: 'Send a message',
      intro: 'Or write to me here. All fields are required.',
      name: 'Name',
      email: 'Email',
      message: 'Message',
      messageHint: 'Between 10 and 5,000 characters.',
      honeypot: 'Leave this field empty',
      submit: 'Send message',
      sending: 'Sending…',
      errors: {
        name: {
          blank: 'Enter your name.',
          too_short: 'Enter your name.',
          too_long: 'Use at most 100 characters for your name.',
          invalid: 'Remove the special control characters from your name.',
        },
        email: {
          blank: 'Enter your email address.',
          too_short: 'Enter your email address.',
          too_long: 'Use an email address of at most 254 characters.',
          invalid: 'Enter an email address like name@example.com.',
        },
        message: {
          blank: 'Enter your message.',
          too_short: 'Write a message of at least 10 characters.',
          too_long: 'Shorten your message to at most 5,000 characters.',
          invalid: 'Remove the special control characters from your message.',
        },
      },
      sent: "Thank you, your message was sent. I'll reply by email.",
      network:
        "Your message couldn't be confirmed as sent: the connection failed, so it may or may not have arrived. Your text is still here. You can try again, or email me if you'd rather not send it twice.",
      unavailable:
        "Your message couldn't be sent right now. Your text is still here: please try again later, or email me.",
      /** {when} is a relative time, e.g. "in 1 hour". */
      rateLimited:
        'Too many messages have been sent from your connection recently. Please try again {when}, or email me.',
      rateLimitedLater: 'later',
      privacy:
        "Privacy: I use your name, email and message only to reply to you. They're stored together with this page's language, and messages are deleted within 12 months under my retention policy. Your IP address isn't saved with your message.",
    },
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
