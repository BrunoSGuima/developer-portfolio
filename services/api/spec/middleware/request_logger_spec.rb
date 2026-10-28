require "rails_helper"
require_relative "../../lib/middleware/request_logger"

# The production request logger: no client IP, filtered paths, static files not logged.
RSpec.describe RequestLogger do
  let(:app) { ->(_env) { [ 200, { "content-type" => "text/plain" }, [ "ok" ] ] } }
  let(:site) { Rack::MockRequest.new(described_class.new(app)) }

  # The log is captured by listening to Rails.logger (LogCapture), never by stubbing it: Rails
  # memoizes Rails.logger into the app's env_config ("action_dispatch.logger") the first time it is
  # read, so a stub in place at that moment would outlive the example and swallow later specs'
  # error logs (an order-dependent failure, seed 54428).
  def log_for(path, **env)
    # Rails adds its env_config (the parameter filter among it) to every request, as here.
    captured_log do
      site.get(path, Rails.application.env_config.merge("REMOTE_ADDR" => "203.0.113.9",
                                                         "HTTP_X_FORWARDED_FOR" => "198.51.100.4").merge(env))
    end
  end

  it "logs requests without the client IP (direct or forwarded)" do
    log = log_for("/pt-br/contact")

    expect(log).to match(%r{Started GET "/pt-br/contact" at })
    expect(log).not_to include("203.0.113.9", "198.51.100.4", " for ")
  end

  it "filters personal data in query strings" do
    log = log_for("/api/v1/projects?email=ada@example.com&name=Ada&message=hello&page=2")

    expect(log).not_to include("ada@example.com", "Ada", "hello")
    expect(log).to include("email=[FILTERED]", "page=2")
  end

  it "doesn't log static files" do
    %w[/assets/index-a1.js /assets/inter.woff2 /favicon-32.png /robots.txt /resumes/resume.pdf].each do |path|
      expect(log_for(path)).to eq(""), path
    end
  end

  it "still logs API paths that look like files" do
    expect(log_for("/api/v1/projects.json")).to include('Started GET "/api/v1/projects.json"')
  end

  # Regression: even when the app's env_config is first built inside this spec, it keeps the real
  # Rails.logger, so nothing here changes where other specs' requests are logged.
  it "leaves the application's request logger untouched" do
    application = Rails.application
    real_logger = Rails.logger
    memoized = application.instance_variable_get(:@app_env_config)
    application.instance_variable_set(:@app_env_config, nil)

    log_for("/pt-br/contact")

    expect(application.env_config["action_dispatch.logger"]).to be(real_logger)
  ensure
    application.instance_variable_set(:@app_env_config, memoized)
  end
end
