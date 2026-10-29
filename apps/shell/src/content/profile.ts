// Source of truth: Bruno's résumé. Never add facts that aren't in it; no phone number.
// Prose is `Localized` (en + pt-BR); names and technologies are the same in every language.

import type { Localized, Text } from '../i18n/localized.ts';
import type { Content } from './placeholder.ts';

export const profile = {
  name: 'Bruno Guimarães',
  fullName: 'Bruno Soares Guimarães',
  firstName: 'Bruno',
  role: {
    en: 'Full-Stack Software Engineer',
    'pt-BR': 'Engenheiro de Software Full-Stack',
  } satisfies Localized<string>,
  location: {
    en: 'Salvador, Brazil',
    'pt-BR': 'Salvador, Brasil',
  } satisfies Localized<string>,
  timeZone: 'UTC−3',
};

export interface HomeContent {
  lead: Localized<string>;
  whatIDo: readonly { title: Localized<string>; text: Localized<string> }[];
  nowLearning: Localized<string>;
  thisSite: Localized<string>;
}

export const home: HomeContent = {
  lead: {
    en: 'Full-Stack Software Engineer building production web applications with Ruby on Rails, React and Vue.js. Currently expanding into Python and AI engineering.',
    'pt-BR':
      'Engenheiro de Software Full-Stack que desenvolve aplicações web em produção com Ruby on Rails, React e Vue.js. Atualmente, expandindo minha atuação para Python e engenharia de IA.',
  },
  whatIDo: [
    {
      title: { en: 'Full-stack product work', 'pt-BR': 'Desenvolvimento full-stack' },
      text: {
        en: 'Features across Rails back ends and React or Vue.js front ends, including REST APIs.',
        'pt-BR':
          'Funcionalidades em back-ends Rails e front-ends React ou Vue.js, incluindo APIs REST.',
      },
    },
    {
      title: { en: 'Production reliability', 'pt-BR': 'Confiabilidade em produção' },
      text: {
        en: 'Investigating and fixing production issues across background jobs, search, reporting and database queries.',
        'pt-BR':
          'Investigação e correção de problemas em produção em jobs em segundo plano, busca, relatórios e consultas ao banco de dados.',
      },
    },
    {
      title: { en: 'Tested, reviewed code', 'pt-BR': 'Código testado e revisado' },
      text: {
        en: 'Automated tests with RSpec in a test-driven workflow, plus regular code reviews.',
        'pt-BR':
          'Testes automatizados com RSpec em um fluxo orientado a testes, além de revisões de código frequentes.',
      },
    },
  ],
  nowLearning: {
    en: "I'm developing my Python and AI engineering skills, currently through Harvard's CS50 Introduction to Artificial Intelligence with Python. This portfolio will grow with them: a Python service and an AI lab are planned sections.",
    'pt-BR':
      'Estou desenvolvendo minhas habilidades em Python e engenharia de IA, atualmente com o curso CS50 Introduction to Artificial Intelligence with Python, de Harvard. Este portfólio vai crescer junto: um serviço em Python e um laboratório de IA são seções planejadas.',
  },
  thisSite: {
    en: "This portfolio is being built step by step as a set of independent applications. Today it's a React and TypeScript app; a Ruby on Rails API, a Vue.js section and a Python service are planned. The Fun Fact on every page tells you what's really running underneath.",
    'pt-BR':
      'Este portfólio está sendo construído passo a passo como um conjunto de aplicações independentes. Hoje ele é uma aplicação React e TypeScript; uma API em Ruby on Rails, uma seção em Vue.js e um serviço em Python estão planejados. A Curiosidade de cada página mostra o que realmente está rodando por trás.',
  },
};

export interface AboutContent {
  lead: Localized<string>;
  careerNote: Localized<string>;
  background: Localized<string>;
  backgroundDetail: Localized<Content>;
  /**
   * One PDF per language in apps/shell/public/resumes/. Public copies must be phone-free (text and
   * metadata checked before they are committed; see the .gitignore rules).
   */
  resume: { label: Localized<string>; href: Localized<string> };
}

export const about: AboutContent = {
  lead: {
    en: "I'm a Full-Stack Software Engineer based in Salvador, Brazil. Since 2023 I've built and maintained production web applications with Ruby on Rails, React and Vue.js, working across back end, front end, background processing and search, and collaborating with Engineering, Product and QA.",
    'pt-BR':
      'Sou Engenheiro de Software Full-Stack e moro em Salvador, Bahia. Desde 2023, desenvolvo e mantenho aplicações web em produção com Ruby on Rails, React e Vue.js, atuando em back-end, front-end, processamento em segundo plano e busca, em colaboração com as equipes de Engenharia, Produto e QA.',
  },
  careerNote: {
    en: 'A more detailed career section is planned for this site.',
    'pt-BR': 'Uma seção mais detalhada sobre a minha carreira está planejada para este site.',
  },
  background: {
    en: "Before moving into software engineering, I earned a Bachelor's degree in Law.",
    'pt-BR': 'Antes de migrar para a engenharia de software, me formei bacharel em Direito.',
  },
  backgroundDetail: {
    en: 'My background in Law strengthened my analytical thinking, attention to detail, and problem-solving skills, which I now apply to software engineering.',
    'pt-BR':
      'A formação em Direito fortaleceu meu pensamento analítico, minha atenção aos detalhes e minha capacidade de resolver problemas, habilidades que hoje aplico na engenharia de software.',
  },
  resume: {
    label: {
      en: 'Download my résumé (PDF)',
      'pt-BR': 'Baixar meu currículo (PDF)',
    },
    href: {
      en: '/resumes/BRUNO_GUIMARAES_FULL_STACK_ENGINEER_RESUME.pdf',
      'pt-BR': '/resumes/Curriculo_Bruno_Guimaraes_Port.pdf',
    },
  },
};

export interface SkillGroup {
  label: Localized<string>;
  items: readonly Text[];
}

/** Skills used professionally (résumé). Python is deliberately not here: see `developingSkills`. */
export const professionalSkills: readonly SkillGroup[] = [
  {
    label: { en: 'Languages', 'pt-BR': 'Linguagens' },
    items: ['Ruby', 'JavaScript', 'TypeScript', 'SQL'],
  },
  {
    label: { en: 'Frameworks', 'pt-BR': 'Frameworks' },
    items: ['Ruby on Rails', 'React', 'Vue.js'],
  },
  {
    label: { en: 'Databases & search', 'pt-BR': 'Bancos de dados e busca' },
    items: ['PostgreSQL', 'Redis', 'Elasticsearch', 'Searchkick'],
  },
  {
    label: { en: 'APIs & background jobs', 'pt-BR': 'APIs e jobs em segundo plano' },
    items: [{ en: 'REST APIs', 'pt-BR': 'APIs REST' }, 'GraphQL', 'Sidekiq'],
  },
  {
    label: { en: 'Testing & quality', 'pt-BR': 'Testes e qualidade' },
    items: [
      'RSpec',
      'TDD',
      { en: 'Test automation', 'pt-BR': 'Automação de testes' },
      { en: 'Code review', 'pt-BR': 'Revisão de código' },
    ],
  },
  {
    label: { en: 'DevOps & tools', 'pt-BR': 'DevOps e ferramentas' },
    items: ['AWS', 'Docker', 'CI/CD', 'Git', 'GitHub', 'GitLab', 'Linux'],
  },
  {
    label: { en: 'Ways of working', 'pt-BR': 'Formas de trabalho' },
    items: [{ en: 'Agile (Scrum, Kanban)', 'pt-BR': 'Metodologias ágeis (Scrum, Kanban)' }],
  },
  {
    label: { en: 'AI-assisted development', 'pt-BR': 'Desenvolvimento assistido por IA' },
    items: [
      'Claude Code',
      'Grok Bot',
      'Cursor',
      {
        en: 'Multi-agent workflows (development, design and QA agents) with human supervision, code review and validation',
        'pt-BR':
          'Fluxos multiagente (agentes de desenvolvimento, design e QA) com supervisão humana, revisão de código e validação',
      },
    ],
  },
];

/** Areas of ongoing development, kept separate from professional experience. */
export const developingSkills: readonly { name: Localized<string>; note: Localized<string> }[] = [
  {
    name: { en: 'Python and AI engineering', 'pt-BR': 'Python e engenharia de IA' },
    note: { en: 'Harvard CS50AI, in progress', 'pt-BR': 'Harvard CS50AI, em andamento' },
  },
  {
    name: { en: 'TypeScript', 'pt-BR': 'TypeScript' },
    note: {
      en: 'strengthening my practical experience by building this portfolio with it',
      'pt-BR': 'fortalecendo minha experiência prática ao construir este portfólio com ele',
    },
  },
  {
    name: { en: 'Distributed systems', 'pt-BR': 'Sistemas distribuídos' },
    note: {
      en: "this portfolio's multi-service architecture",
      'pt-BR': 'a arquitetura multisserviço deste portfólio',
    },
  },
];

export const languages: readonly { language: Localized<string>; level: Localized<string> }[] = [
  {
    language: { en: 'English', 'pt-BR': 'Inglês' },
    level: { en: 'C2 Proficient (EF SET 75/100)', 'pt-BR': 'C2 Proficiente (EF SET 75/100)' },
  },
  {
    language: { en: 'Portuguese', 'pt-BR': 'Português' },
    level: { en: 'Native', 'pt-BR': 'Nativo' },
  },
  {
    language: { en: 'Spanish', 'pt-BR': 'Espanhol' },
    level: { en: 'Basic', 'pt-BR': 'Básico' },
  },
];
