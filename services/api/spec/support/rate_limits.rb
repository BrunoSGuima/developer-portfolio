# Rate-limit counters live in an in-memory store (config.x.rate_limit_store): start every request
# spec from zero. TimeHelpers (travel) lets specs move past a limit's window.
RSpec.configure do |config|
  config.include ActiveSupport::Testing::TimeHelpers
  config.before(type: :request) { Rails.configuration.x.rate_limit_store.clear }
end
