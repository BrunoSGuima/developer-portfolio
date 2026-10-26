# The environment Playwright runs the API in (Phase 3, ADR-0009): development settings, plus the
# few differences that make full-stack end-to-end tests deterministic and production-like. Its
# database (portfolio_api_e2e) is separate from development and test, and Rails' database
# tasks in this environment never touch theirs. Started by bin/e2e-server only.
require_relative "development"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true

  # Errors render like production: the JSON envelope from config.exceptions_app.
  config.consider_all_requests_local = false

  # Nothing persistent depends on it; a fresh key per boot avoids needing the master key in CI.
  config.secret_key_base = SecureRandom.hex(64)

  # Rate-limit counters in files at a fixed path, so the end-to-end suite can reset them between
  # serial tests (e2e/support/rateLimits.ts) without any endpoint. Only this environment uses a
  # file store; every other one keeps the in-memory default from config/application.rb.
  config.x.rate_limit_store = ActiveSupport::Cache::FileStore.new(Rails.root.join("tmp/e2e/rate-limits"))
end
