FactoryBot.define do
  factory :contact_message do
    name { "Ada Lovelace" }
    sequence(:email) { |n| "ada#{n}@example.com" }
    message { "Hello! I'd like to talk about a role." }
    locale { "en" }
  end
end
