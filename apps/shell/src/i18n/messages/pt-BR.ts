import type { Messages } from './en.ts';

/** Brazilian Portuguese interface strings. Typed `Messages`: keys must match `en` exactly. */
export const ptBR: Messages = {
  site: {
    title: 'Bruno Guimarães — Engenheiro de Software Full-Stack',
  },
  layout: {
    skipLink: 'Pular para o conteúdo',
    mainNav: 'Principal',
    menu: 'Menu',
    languageNav: 'Idioma',
  },
  funFact: {
    region: 'Curiosidade',
    label: 'Curiosidade',
    technologies: 'Tecnologias',
  },
  tech: {
    planned: 'planejado',
  },
  status: {
    done: 'Concluído',
    live: 'No ar',
    'in-progress': 'Em andamento',
    planned: 'Planejado',
  },
  placeholder: {
    toConfirm: 'A confirmar',
  },
  projectCard: {
    technologies: 'Tecnologias',
    links: 'Links',
  },
  home: {
    heading: 'Olá, eu sou o Bruno.',
    viewProjects: 'Ver projetos',
    aboutMe: 'Sobre mim',
    whatIDo: 'O que eu faço',
    nowLearning: 'Aprendendo agora',
    thisSite: 'Este site também é um projeto',
    exploreArchitecture: 'Conheça a arquitetura',
  },
  about: {
    experience: 'Experiência',
    skills: 'Habilidades',
    skillsProfessional: 'Experiência profissional',
    skillsDeveloping: 'Em desenvolvimento',
    education: 'Formação',
    languages: 'Idiomas',
    background: 'Trajetória',
  },
  projects: {
    leadBeforeLink:
      'Projetos que construí publicamente. A maior parte do meu trabalho profissional está em bases de código privadas de clientes, por isso não aparece aqui; minha experiência está resumida na página',
    leadLink: 'Sobre',
    leadAfterLink: '.',
    note: 'Novos projetos públicos serão adicionados à medida que este portfólio crescer.',
  },
  architecture: {
    leadBeforeStatus:
      'Este portfólio é tanto um projeto de aprendizado quanto uma vitrine. Veja como ele é construído hoje e para onde está indo. Tudo o que estiver marcado como',
    leadAfterStatus: 'ainda não existe.',
    builtToday: 'Como ele é construído hoje',
    evolution: 'Como ele vai evoluir',
    timelineNote:
      'A API em Rails (v2) está construída e testada de forma independente; as páginas ainda não estão conectadas a ela, e esse é o próximo passo (v3). O deploy vem depois dessa integração. A ordem das etapas seguintes (v5–v8) é provisória.',
    decisions: 'Principais decisões',
  },
  contact: {
    location: 'Localização',
  },
  notFound: {
    title: 'Página não encontrada',
    text: 'Não há nada neste endereço.',
    home: 'Voltar ao início',
    description: 'Esta página não existe no portfólio de Bruno Guimarães.',
  },
  remote: {
    loading: 'Carregando a seção…',
  },
  error: {
    title: 'Algo deu errado',
    text: 'Não foi possível carregar esta seção. Tente novamente.',
    reload: 'Recarregar a página',
  },
};
