require "rails_helper"

# The production host rules (config/environments/production.rb) through the same settings, in front
# of the real app: only the exact hosts in ALLOWED_HOSTS, /up exempt, a JSON 403 otherwise.
RSpec.describe "Host authorization (production settings)" do
  let(:hosts) { ProductionSettings.allowed_hosts("portfolio-xyz.onrender.com,example.dev") }
  let(:site) do
    Rack::MockRequest.new(
      ActionDispatch::HostAuthorization.new(
        Rails.application, hosts,
        exclude: ProductionSettings::HOST_CHECK_EXCLUDED, response_app: ProductionSettings::BLOCKED_HOST_RESPONSE
      )
    )
  end

  def get(path, host)
    site.get(path, "HTTP_HOST" => host)
  end

  it "answers the allowed hosts, with or without a port" do
    %w[example.dev portfolio-xyz.onrender.com example.dev:443].each do |host|
      expect(get("/api/v1/projects", host).status).to eq(200), host
    end
  end

  it "blocks any other host, subdomains included, with a JSON 403 that lists no hosts" do
    %w[evil.example sub.example.dev other-app.onrender.com example.dev.evil.example].each do |host|
      response = get("/api/v1/projects", host)

      expect(response.status).to eq(403), host
      expect(response.headers["content-type"]).to start_with("application/json")
      expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden_host")
      expect(response.body).not_to include("example.dev")
      expect(response.body).not_to include("onrender")
    end
  end

  it "leaves /up to platform health checks on any host" do
    expect(get("/up", "10.0.0.7:3000").status).to eq(200)
  end
end
