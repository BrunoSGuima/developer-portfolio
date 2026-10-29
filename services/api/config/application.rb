require_relative "boot"
require_relative "../lib/middleware/json_body_guard"
require_relative "../lib/middleware/shell_assets"
require_relative "../lib/middleware/security_headers"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
# require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Api
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks middleware])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # Errors Rails renders itself (production, and rescuable ones in tests) use the API's JSON
    # error envelope (ADR-0012) instead of Rails' default body. Development keeps Rails' detailed
    # error responses (consider_all_requests_local).
    config.exceptions_app = ->(env) { Api::ErrorsController.action(:show).call(env) }

    # Rails' IP-spoofing check raises when X-Forwarded-For and Client-IP disagree, and it runs in
    # the request logger, outside Rails' error handling: any client could crash a request with
    # two forged headers. The API doesn't rely on forwarded headers from untrusted peers (see
    # Api::V1::ContactMessagesController#client_ip), so the check only did harm.
    config.action_dispatch.ip_spoofing_check = false

    # Request bodies sent to /api are handled before Rails parses them: checked (JSON, size, valid
    # object) for the routes that take one, discarded for every other route.
    config.middleware.use JsonBodyGuard

    # Security headers and the Content Security Policy on every response (Step 4.3): first in the
    # stack (before host authorization and SSL), so early answers such as a blocked host get them.
    # Production applies the document policy to every HTML response (see the class).
    config.middleware.insert_before 0, SecurityHeaders, all_html: Rails.env.production?

    # The production image serves the React shell's build from the same origin (Step 4.2):
    # SHELL_ROOT points at it. Unset in development, test and e2e, which serve no shell.
    if ENV["SHELL_ROOT"].present?
      config.middleware.use ShellAssets, root: ENV["SHELL_ROOT"]
    end

    # Counters for rate limits (Api::V1::ContactMessagesController). In memory and per process:
    # right for the single Puma process the app runs (no WEB_CONCURRENCY); several processes
    # would need a store shared by all of them (ADR-0013).
    config.x.rate_limit_store = ActiveSupport::Cache::MemoryStore.new
  end
end
