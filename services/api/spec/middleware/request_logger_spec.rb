require "rails_helper"
require_relative "../../lib/middleware/request_logger"

# The production request logger: no client IP, filtered paths, static files not logged.
RSpec.describe RequestLogger do
  let(:output) { StringIO.new }
  let(:logger) { ActiveSupport::TaggedLogging.new(ActiveSupport::Logger.new(output)) }
  let(:app) { ->(_env) { [ 200, { "content-type" => "text/plain" }, [ "ok" ] ] } }
  let(:site) { Rack::MockRequest.new(described_class.new(app)) }

  before { allow(Rails).to receive(:logger).and_return(logger) }

  def log_for(path, **env)
    # Rails adds its env_config (the parameter filter among it) to every request, as here.
    site.get(path, Rails.application.env_config.merge("REMOTE_ADDR" => "203.0.113.9",
                                                       "HTTP_X_FORWARDED_FOR" => "198.51.100.4").merge(env))
    output.string
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
    %w[/assets/index-a1.js /assets/inter.woff2 /favicon-32.png /robots.txt /Bruno_Guimaraes_Resume.pdf].each do |path|
      expect(log_for(path)).to eq(""), path
    end
  end

  it "still logs API paths that look like files" do
    expect(log_for("/api/v1/projects.json")).to include('Started GET "/api/v1/projects.json"')
  end
end
