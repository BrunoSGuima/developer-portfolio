# Lets specs call create/build/attributes_for without the FactoryBot prefix.
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
