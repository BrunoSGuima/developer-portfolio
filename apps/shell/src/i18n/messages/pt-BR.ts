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
    loading: 'Carregando projetos…',
    empty: 'Ainda não há projetos para mostrar.',
    error: 'Não foi possível carregar os projetos. Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente',
  },
  architecture: {
    leadBeforeStatus:
      'Este portfólio é tanto um projeto de aprendizado quanto uma vitrine. Veja como ele é construído hoje e para onde está indo. Tudo o que estiver marcado como',
    leadAfterStatus: 'ainda não existe.',
    builtToday: 'Como ele é construído hoje',
    evolution: 'Como ele vai evoluir',
    timelineNote: {
      static:
        'A API em Rails (v2) e a sua integração com este site (v3) estão construídas e testadas; esta é a versão estática, que funciona sem a API e sem banco de dados. O deploy (v4) é a próxima etapa. A ordem das etapas seguintes (v5–v8) é provisória.',
      fullstack:
        'A página de Projetos carrega seus dados da API em Rails e o formulário de contato envia mensagens para ela, o que conclui a integração (v3). O deploy (v4) é a próxima etapa. A ordem das etapas seguintes (v5–v8) é provisória.',
    },
    decisions: 'Principais decisões',
  },
  contact: {
    location: 'Localização',
    form: {
      heading: 'Envie uma mensagem',
      intro: 'Ou escreva para mim por aqui. Todos os campos são obrigatórios.',
      name: 'Nome',
      email: 'E-mail',
      message: 'Mensagem',
      messageHint: 'Entre 10 e 5.000 caracteres.',
      honeypot: 'Deixe este campo em branco',
      submit: 'Enviar mensagem',
      sending: 'Enviando…',
      errors: {
        name: {
          blank: 'Informe seu nome.',
          too_short: 'Informe seu nome.',
          too_long: 'Use no máximo 100 caracteres no seu nome.',
          invalid: 'Remova os caracteres de controle especiais do seu nome.',
        },
        email: {
          blank: 'Informe seu endereço de e-mail.',
          too_short: 'Informe seu endereço de e-mail.',
          too_long: 'Use um endereço de e-mail de no máximo 254 caracteres.',
          invalid: 'Informe um endereço de e-mail como nome@exemplo.com.',
        },
        message: {
          blank: 'Escreva sua mensagem.',
          too_short: 'Escreva uma mensagem com pelo menos 10 caracteres.',
          too_long: 'Reduza sua mensagem para no máximo 5.000 caracteres.',
          invalid: 'Remova os caracteres de controle especiais da sua mensagem.',
        },
      },
      sent: 'Obrigado, sua mensagem foi enviada. Vou responder por e-mail.',
      network:
        'Não foi possível confirmar o envio da sua mensagem: a conexão falhou, então ela pode ou não ter chegado. Seu texto continua aqui. Você pode tentar de novo, ou me mandar um e-mail se preferir não enviá-la duas vezes.',
      unavailable:
        'Não foi possível enviar sua mensagem agora. Seu texto continua aqui: tente novamente mais tarde, ou me mande um e-mail.',
      rateLimited:
        'Muitas mensagens foram enviadas da sua conexão recentemente. Tente novamente {when}, ou me mande um e-mail.',
      rateLimitedLater: 'mais tarde',
      privacy:
        'Privacidade: uso seu nome, e-mail e mensagem apenas para responder a você. Eles são armazenados junto com o idioma desta página, e as mensagens são excluídas em até 12 meses, conforme minha política de retenção. Seu endereço IP não é salvo com a sua mensagem.',
    },
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
