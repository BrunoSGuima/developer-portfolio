require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
# Prevent database truncation if the environment is production
abort("The Rails environment is running in production mode!") if Rails.env.production?
require "rspec/rails"

Rails.root.glob("spec/support/**/*.rb").sort_by(&:to_s).each { |file| require file }

# Keep the test database schema in sync with db/schema.rb.
begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  # Every example runs inside a database transaction that is rolled back afterwards, so examples
  # never see each other's data (no DatabaseCleaner needed).
  config.use_transactional_fixtures = true

  # Test data comes from FactoryBot (spec/factories), not fixtures.
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
end
