FactoryBot.define do
  factory :project_link do
    project
    label { { "en" => "Source code", "pt-BR" => "Código-fonte" } }
    sequence(:url) { |n| "https://example.com/#{n}" }
    sequence(:position)
  end
end
