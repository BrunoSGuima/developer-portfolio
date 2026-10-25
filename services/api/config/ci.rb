# Run using bin/ci: every check the API must pass, locally and in CI (Step 2.2 calls it).
# Needs PostgreSQL running (infra/compose.yaml) and the connection settings (.env locally).

CI.run do
  step "Setup", "bin/setup --skip-server"

  step "Style: Ruby", "bin/rubocop"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error"

  step "Tests: RSpec", "bundle exec rspec"
end
