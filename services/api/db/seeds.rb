# Portfolio content (Step 2.3): versioned seeds are how projects are managed until an admin
# exists (ADR-0011). Idempotent: projects are matched by slug and updated in place, and each
# project's links are replaced by the list below. Everything runs in one transaction, so a
# failure leaves the database exactly as it was. Projects not listed here are left untouched.
#
# The text matches the shell's apps/shell/src/content/projects.ts (the static build's data):
# update both together; the full-stack E2E suite compares them.
#
# Load with: bin/rails db:seed (bin/setup does it when it creates the development database).
# The test database is never seeded (config/database.yml: seeds: false).

projects = [
  {
    slug: "developer-portfolio",
    name: {
      "en" => "Developer Portfolio (this site)",
      "pt-BR" => "Portfólio de Desenvolvedor (este site)"
    },
    description: {
      "en" => "An interactive portfolio built as a set of independent applications: a React and " \
              "TypeScript shell with client-side routing, accessibility-first components and a Fun " \
              "Fact that describes the real stack behind each page, and a Ruby on Rails API with " \
              "PostgreSQL. Next up: a Vue.js microfrontend and a Python service.",
      "pt-BR" => "Um portfólio interativo construído como um conjunto de aplicações independentes: um " \
                 "shell em React e TypeScript com roteamento no navegador, componentes pensados para " \
                 "acessibilidade e uma Curiosidade que descreve a tecnologia real por trás de cada " \
                 "página, e uma API em Ruby on Rails com PostgreSQL. Próximos passos: um microfrontend " \
                 "em Vue.js e um serviço em Python."
    },
    status: "in-progress",
    technologies: %w[react typescript vite react-router rails],
    position: 0,
    published: true,
    links: [
      { label: { "en" => "Source code", "pt-BR" => "Código-fonte" },
        url: "https://github.com/BrunoSGuima/developer-portfolio" }
    ]
  },
  {
    # The repository is private: no link.
    slug: "personal-finance-app",
    name: { "en" => "Personal Finance App", "pt-BR" => "App de Finanças Pessoais" },
    description: {
      "en" => "A personal finance mobile app built with Flutter and Dart, in development: it already lets " \
              "you create, view, edit and delete financial records. I build it with a multi-agent AI " \
              "workflow: Grok Bot and Cursor coordinate agents for development, design and QA, while I " \
              "plan, supervise, review the code and validate the results.",
      "pt-BR" => "Um app mobile de finanças pessoais feito com Flutter e Dart, em desenvolvimento: ele já " \
                 "permite criar, visualizar, editar e excluir registros financeiros. Eu o desenvolvo com um " \
                 "fluxo multiagente de IA: o Grok Bot e o Cursor coordenam agentes de desenvolvimento, design " \
                 "e QA, enquanto eu planejo, supervisiono, reviso o código e valido os resultados."
    },
    status: "in-progress",
    technologies: %w[flutter dart],
    position: 1,
    published: true,
    links: []
  },
  {
    slug: "auction-house",
    name: { "en" => "Auction House", "pt-BR" => "Casa de Leilões" },
    description: {
      "en" => "A Ruby on Rails auction platform built during the Campus Code TreinaDev program: users bid " \
              "on product lots, follow the bids, favourite lots and ask questions; administrators manage " \
              "products and categories, approve and close lots, and block accounts by CPF. Authentication " \
              "with Devise; tested with RSpec and Capybara system specs.",
      "pt-BR" => "Uma plataforma de leilões em Ruby on Rails desenvolvida durante o programa TreinaDev da " \
                 "Campus Code: usuários dão lances em lotes de produtos, acompanham os lances, favoritam " \
                 "lotes e enviam perguntas; administradores gerenciam produtos e categorias, aprovam e " \
                 "encerram lotes e bloqueiam contas por CPF. Autenticação com Devise; testes com RSpec e " \
                 "testes de sistema com Capybara."
    },
    status: "done",
    technologies: %w[rails rspec bootstrap],
    position: 2,
    published: true,
    links: [
      { label: { "en" => "Source code", "pt-BR" => "Código-fonte" },
        url: "https://github.com/BrunoSGuima/auction-house" }
    ]
  }
].freeze

# requires_new: an ordinary transaction here, a savepoint when already inside one (the specs).
ActiveRecord::Base.transaction(requires_new: true) do
  projects.each do |data|
    project = Project.find_or_initialize_by(slug: data.fetch(:slug))
    project.update!(data.except(:slug, :links))

    project.links.destroy_all
    data.fetch(:links).each_with_index do |link, index|
      project.links.create!(**link, position: index)
    end
  end
end
