require "rails_helper"
require "tmpdir"

# The middleware on its own (Rack::MockRequest) over a temporary shell build, in front of an app
# that records what reaches it (standing in for Rails).
RSpec.describe ShellAssets do
  let(:reached) { [] }
  let(:app) do
    lambda do |env|
      reached << "#{env['REQUEST_METHOD']} #{env['PATH_INFO']}"
      [ 404, { "content-type" => "application/json" }, [ '{"error":{"code":"not_found"}}' ] ]
    end
  end
  let(:outside) { Dir.mktmpdir("outside") }
  let(:root) { Dir.mktmpdir("shell") }
  let(:shell) { Rack::MockRequest.new(described_class.new(app, root:)) }

  before do
    FileUtils.mkdir_p(File.join(root, "assets"))
    File.write(File.join(root, "index.html"), '<!doctype html><div id="root"></div>')
    File.write(File.join(root, "assets", "index-abc123.js"), "console.log(1)")
    File.write(File.join(root, "assets", "index-abc123.css"), "body{}")
    File.write(File.join(root, "assets", "inter-latin-wght-normal-x1.woff2"), "wOF2")
    File.write(File.join(root, "assets", "hero-1174-y2.webp"), "RIFF")
    File.write(File.join(root, "robots.txt"), "User-agent: *")
    File.write(File.join(root, "favicon-32.png"), "PNG")
    # Files that must never be served, even if they end up in the build.
    File.write(File.join(root, "assets", "index-abc123.js.map"), "{}")
    File.write(File.join(root, ".env"), "SECRET=1")
    File.write(File.join(outside, "secret.txt"), "outside the shell")
    File.symlink(File.join(outside, "secret.txt"), File.join(root, "leak.txt"))
    File.symlink(outside, File.join(root, "escape"))
  end

  after do
    FileUtils.remove_entry(root)
    FileUtils.remove_entry(outside)
  end

  def shell_document?(response)
    response.status == 200 && response.body.include?('<div id="root">') &&
      response.headers["content-type"] == "text/html; charset=utf-8" &&
      response.headers["cache-control"] == "no-cache"
  end

  it "refuses a root without index.html (fails at boot, not on the first request)" do
    expect { described_class.new(app, root: outside) }.to raise_error(ArgumentError, /index\.html/)
  end

  describe "the shell's pages" do
    it "serves index.html for /, deep links and unknown pages (the shell routes them)" do
      %w[/ /pt-br/contact /about/ /does-not-exist /index.html].each do |path|
        expect(shell_document?(shell.get(path))).to be(true), path
      end
      expect(reached).to be_empty
    end

    it "answers HEAD like GET, without a body" do
      response = shell.request("HEAD", "/pt-br/projects")

      expect(response.status).to eq(200)
      expect(response.headers["cache-control"]).to eq("no-cache")
    end
  end

  describe "files in the build" do
    it "caches the Vite-hashed assets for a year, with correct types" do
      {
        "/assets/index-abc123.js" => "text/javascript; charset=utf-8",
        "/assets/index-abc123.css" => "text/css; charset=utf-8",
        "/assets/inter-latin-wght-normal-x1.woff2" => "font/woff2",
        "/assets/hero-1174-y2.webp" => "image/webp"
      }.each do |path, type|
        response = shell.get(path)

        expect(response.status).to eq(200), path
        expect(response.headers["content-type"]).to eq(type)
        expect(response.headers["cache-control"]).to eq("public, max-age=31536000, immutable")
        expect(response.headers["x-content-type-options"]).to eq("nosniff")
        expect(response.headers["last-modified"]).to be_present
      end
    end

    it "caches the unhashed root files for an hour" do
      response = shell.get("/robots.txt")

      expect(response.status).to eq(200)
      expect(response.body).to eq("User-agent: *")
      expect(response.headers["cache-control"]).to eq("public, max-age=3600")
    end
  end

  describe "missing and refused paths" do
    it "answers a missing file (a path with an extension) with 404, never the shell" do
      %w[/assets/index-old999.js /favicon.ico /missing.css].each do |path|
        response = shell.get(path)

        expect(response.status).to eq(404), path
        expect(response.body).not_to include('<div id="root">')
      end
    end

    it "never serves source maps, even present in the build" do
      expect(shell.get("/assets/index-abc123.js.map").status).to eq(404)
      expect(shell.get("/assets/anything.map").status).to eq(404)
    end

    it "answers sensitive server-side paths with 404, never the shell or a file" do
      %w[
        /.env /.git/config /.ssh/id_rsa /assets/.hidden /Gemfile /gemfile /Gemfile.lock
        /Rakefile /Dockerfile /config/database.yml /config/master.key /config
        /app/models/contact_message.rb /db/seeds.rb /spec /services/api/.env /node_modules/x
      ].each do |path|
        response = shell.get(path)

        expect(response.status).to eq(404), path
        expect(response.body).to eq("Not found"), path
      end
    end

    it "rejects traversal, encoded or not, and undecodable paths" do
      %w[
        /../outside/secret.txt /assets/../../secret.txt /%2e%2e/secret.txt /assets/%2e%2e%2f%2e%2e%2fsecret
        /%2E%2E/%2E%2E/etc/passwd /a/%00/b /a%5c..%5csecret /%ff%fe /./index.html
      ].each do |path|
        response = shell.get(path)

        expect(response.status).to eq(404), path
        expect(response.body).not_to include("outside the shell")
      end
    end

    it "never follows a symlink out of the shell's root" do
      %w[/leak.txt /escape/secret.txt /escape].each do |path|
        response = shell.get(path)

        expect(response.status).to eq(404), path
        expect(response.body).not_to include("outside the shell")
      end
    end
  end

  describe "requests left to Rails" do
    it "passes /api, /api/… and /up through for any method (JSON errors stay JSON)" do
      responses = [
        shell.get("/api"), shell.get("/api/v1/nope"), shell.get("/api/v1/projects/x.js"),
        shell.post("/api/v1/contact_messages"), shell.get("/up"), shell.get("/up/x")
      ]

      expect(responses.map(&:status).uniq).to eq([ 404 ])
      expect(responses.map { |response| response.headers["content-type"] }.uniq).to eq([ "application/json" ])
      expect(reached).to eq([
        "GET /api", "GET /api/v1/nope", "GET /api/v1/projects/x.js",
        "POST /api/v1/contact_messages", "GET /up", "GET /up/x"
      ])
    end

    it "passes other methods through (Rails answers them), even on page URLs" do
      %w[POST PUT PATCH DELETE OPTIONS].each { |method| shell.request(method, "/pt-br/contact") }

      expect(reached).to eq(%w[POST PUT PATCH DELETE OPTIONS].map { |method| "#{method} /pt-br/contact" })
    end
  end
end
