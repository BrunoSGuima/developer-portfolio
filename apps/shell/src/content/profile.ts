// Source of truth: Bruno's résumé. Never add facts that aren't in it; no phone number.

export const profile = {
  name: 'Bruno Guimarães',
  fullName: 'Bruno Soares Guimarães',
  firstName: 'Bruno',
  role: 'Full-Stack Software Engineer',
  location: 'Salvador, Brazil',
  timeZone: 'UTC−3',
};

export const home = {
  lead: 'Full-Stack Software Engineer building production web applications with Ruby on Rails, React and Vue.js. Currently expanding into Python and AI engineering.',
  whatIDo: [
    {
      title: 'Full-stack product work',
      text: 'Features across Rails back ends and React or Vue.js front ends, including REST APIs.',
    },
    {
      title: 'Production reliability',
      text: 'Investigating and fixing production issues across background jobs, search, reporting and database queries.',
    },
    {
      title: 'Tested, reviewed code',
      text: 'Automated tests with RSpec in a test-driven workflow, plus regular code reviews.',
    },
  ],
  nowLearning:
    "I'm developing my Python and AI engineering skills, currently through Harvard's CS50 Introduction to Artificial Intelligence with Python. This portfolio will grow with them: a Python service and an AI lab are planned sections.",
  thisSite:
    "This portfolio is being built step by step as a set of independent applications. Today it's a React and TypeScript app; a Ruby on Rails API, a Vue.js section and a Python service are planned. The Fun Fact on every page tells you what's really running underneath.",
};

export const about = {
  lead: "I'm a Full-Stack Software Engineer based in Salvador, Brazil. Since 2023 I've built and maintained production web applications with Ruby on Rails, React and Vue.js, working across back end, front end, background processing and search, and collaborating with Engineering, Product and QA.",
  careerNote: 'A more detailed career section is planned for this site.',
  background: "Before moving into software engineering, I earned a Bachelor's degree in Law.",
  backgroundDetail:
    'My background in Law strengthened my analytical thinking, attention to detail, and problem-solving skills, which I now apply to software engineering.',
  /** Phone-free public copy in apps/shell/public/ (see the .gitignore exception). */
  resume: { label: 'Download my résumé (PDF)', href: '/Bruno_Guimaraes_Resume.pdf' },
};

export interface SkillGroup {
  label: string;
  items: readonly string[];
}

/** Skills used professionally (résumé). Python is deliberately not here: see `developingSkills`. */
export const professionalSkills: readonly SkillGroup[] = [
  { label: 'Languages', items: ['Ruby', 'JavaScript', 'SQL'] },
  { label: 'Frameworks', items: ['Ruby on Rails', 'React', 'Vue.js'] },
  { label: 'Databases & search', items: ['PostgreSQL', 'Redis', 'Elasticsearch', 'Searchkick'] },
  { label: 'APIs & background jobs', items: ['REST APIs', 'GraphQL', 'Sidekiq'] },
  { label: 'Testing & quality', items: ['RSpec', 'TDD', 'Test automation', 'Code review'] },
  {
    label: 'DevOps & tools',
    items: ['AWS', 'Docker', 'CI/CD', 'Git', 'GitHub', 'GitLab', 'Linux'],
  },
  { label: 'Ways of working', items: ['Agile (Scrum, Kanban)', 'AI-assisted development'] },
];

/** Areas of ongoing development, kept separate from professional experience. */
export const developingSkills: readonly { name: string; note: string }[] = [
  { name: 'Python and AI engineering', note: 'Harvard CS50AI, in progress' },
  { name: 'TypeScript', note: 'this portfolio is written in it' },
  { name: 'Distributed systems', note: "this portfolio's multi-service architecture" },
];

export const languages: readonly { language: string; level: string }[] = [
  { language: 'English', level: 'C2 Proficient (EF SET 75/100)' },
  { language: 'Portuguese', level: 'Native' },
  { language: 'Spanish', level: 'Basic' },
];
