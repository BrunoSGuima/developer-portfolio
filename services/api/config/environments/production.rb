require "active_support/core_ext/integer/time"
require_relative "../../lib/production_settings"
require_relative "../../lib/middleware/request_logger"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Rails' static file server is off: the React shell is served by ShellAssets (SHELL_ROOT), which
  # caches hashed assets for a year but revalidates index.html (one header for every file can't).
  config.public_file_server.enabled = false

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  config.assume_ssl = true

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = true

  # HSTS for the first deployment (Step 4.3, owner's decision): HTTPS is enforced, but for a short
  # time and only for the exact host, until the domain and its subdomains are verified. Rails'
  # default (2 years, includeSubDomains) would commit every subdomain to HTTPS for two years.
  # Revisit before public go-live (Step 4.12).
  config.ssl_options = { hsts: { expires: ProductionSettings::HSTS_MAX_AGE, subdomains: false, preload: false } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Request logs without client IPs, and without static-file requests (lib/middleware/request_logger.rb).
  config.middleware.swap Rails::Rack::Logger, RequestLogger

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Replace the default in-process memory cache store with a durable alternative.
  # config.cache_store = :mem_cache_store

  # Replace the default in-process and non-durable queuing backend for Active Job.
  # config.active_job.queue_adapter = :resque

  # Ignore bad email addresses and do not raise email delivery errors.
  # Set this to true and configure the email server for immediate delivery to raise delivery errors.
  # config.action_mailer.raise_delivery_errors = false

  # Set host to be used by links generated in mailer templates.
  config.action_mailer.default_url_options = { host: "example.com" }

  # Specify outgoing SMTP server. Remember to add smtp/* credentials via bin/rails credentials:edit.
  # config.action_mailer.smtp_settings = {
  #   user_name: Rails.application.credentials.dig(:smtp, :user_name),
  #   password: Rails.application.credentials.dig(:smtp, :password),
  #   address: "smtp.example.com",
  #   port: 587,
  #   authentication: :plain
  # }

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  # Host header protection (Step 4.3): only the exact hostnames in ALLOWED_HOSTS, required (boot
  # fails without it, lib/production_settings.rb). /up is exempt, because platform health checks
  # call it on an internal address; a blocked host gets the API's JSON error envelope (403).
  config.hosts = ProductionSettings.allowed_hosts(ENV["ALLOWED_HOSTS"])
  config.host_authorization = {
    exclude: ProductionSettings::HOST_CHECK_EXCLUDED,
    response_app: ProductionSettings::BLOCKED_HOST_RESPONSE
  }

  # Whose forwarded headers (X-Forwarded-For) are believed, for the contact form's rate limits
  # (client_ip, ADR-0013). Unset: Rails' default (loopback and private networks). The production
  # value must be verified on the host before any public deployment (ADR-0016; docs/ROADMAP.md).
  if (proxies = ProductionSettings.trusted_proxies(ENV["TRUSTED_PROXIES"]))
    config.action_dispatch.trusted_proxies = proxies
  end
end
