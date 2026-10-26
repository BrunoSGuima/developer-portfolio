# Portfolio content (Step 2.3): versioned seeds are how projects are managed until an admin
# exists (ADR-0011). Idempotent: projects are matched by slug and updated in place, and each
# project's links are replaced by the list below. Everything runs in one transaction, so a
# failure leaves the database exactly as it was. Projects not listed here are left untouched.
#
# The text is copied from the shell's apps/shell/src/content/projects.ts, which stays the source
# shown on the site until Phase 3 switches it to the API; update both together until then.
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
      "en" => "An interactive portfolio built as a set of independent applications. Today it's a " \
              "React and TypeScript shell with a section registry, client-side routing, " \
              "accessibility-first components and a Fun Fact that describes the real stack behind " \
              "each page. Next up: a Ruby on Rails API, a Vue.js microfrontend and a Python service.",
      "pt-BR" => "Um portfólio interativo construído como um conjunto de aplicações independentes. " \
                 "Hoje ele é um shell em React e TypeScript com registro de seções, roteamento no " \
                 "navegador, componentes pensados para acessibilidade e uma Curiosidade que " \
                 "descreve a tecnologia real por trás de cada página. Próximos passos: uma API em " \
                 "Ruby on Rails, um microfrontend em Vue.js e um serviço em Python."
    },
    status: "in-progress",
    technologies: %w[react typescript vite react-router],
    position: 0,
    published: true,
    links: [
      { label: { "en" => "GitHub profile", "pt-BR" => "Perfil no GitHub" },
        url: "https://github.com/BrunoSGuima" }
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
