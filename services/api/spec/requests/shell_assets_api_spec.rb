require "rails_helper"
require "tmpdir"

# The real Rails app behind ShellAssets, as the production image runs it (SHELL_ROOT set): the
# API's answers, including its JSON errors, must be exactly what they are without the shell.
RSpec.describe "The API behind ShellAssets" do
  let(:root) { Dir.mktmpdir("shell") }
  let(:site) { Rack::MockRequest.new(ShellAssets.new(Rails.application, root:)) }

  before { File.write(File.join(root, "index.html"), '<!doctype html><div id="root"></div>') }
  after { FileUtils.remove_entry(root) }

  def json(response)
    expect(response.headers["content-type"]).to start_with("application/json")
    JSON.parse(response.body)
  end

  it "serves the API's data" do
    create(:project)

    response = site.get("/api/v1/projects")

    expect(response.status).to eq(200)
    expect(json(response)["data"]).to be_an(Array)
  end

  it "keeps the JSON 404 for unknown API paths, even ones that look like pages or files" do
    %w[/api /api/v1/nope /api/v1/projects/missing /api/pt-br/contact /api/v1/x.js].each do |path|
      response = site.get(path)

      expect(response.status).to eq(404), path
      expect(json(response).dig("error", "code")).to eq("not_found"), path
    end
  end

  it "keeps the 405 with Allow and the body checks" do
    not_allowed = site.post("/api/v1/projects")
    expect(not_allowed.status).to eq(405)
    expect(not_allowed.headers["allow"]).to eq("GET, HEAD")

    wrong_type = site.post("/api/v1/contact_messages", input: "x", "CONTENT_TYPE" => "text/plain")
    expect(wrong_type.status).to eq(415)
    expect(json(wrong_type).dig("error", "code")).to eq("unsupported_media_type")
  end

  it "leaves /up to Rails" do
    expect(site.get("/up").status).to eq(200)
  end

  # In production Rails renders that 404 as the JSON envelope (exceptions_app); the test
  # environment shows its debug page instead, so only the status is asserted here.
  it "serves the shell for page URLs and leaves other methods there to Rails (404)" do
    expect(site.get("/pt-br/contact").body).to include('<div id="root">')

    response = site.post("/pt-br/contact")
    expect(response.status).to eq(404)
    expect(response.body).not_to include('<div id="root">')
  end
end
