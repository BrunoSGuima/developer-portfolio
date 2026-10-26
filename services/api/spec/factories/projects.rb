FactoryBot.define do
  factory :project do
    sequence(:slug) { |n| "project-#{n}" }
    name { { "en" => "Example project", "pt-BR" => "Projeto de exemplo" } }
    description { { "en" => "What the project is about.", "pt-BR" => "Do que se trata o projeto." } }
    status { "planned" }
    technologies { %w[rails] }
    sequence(:position)
    published { true }

    trait :unpublished do
      published { false }
    end

    trait :with_links do
      after(:create) { |project| create_list(:project_link, 2, project:) }
    end
  end
end
