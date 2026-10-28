require "rails_helper"
require "tmpdir"

RSpec.describe SecurityHeaders do
  def app_returning(type, &block)
    lambda do |env|
      block&.call(env)
      [ 200, { "content-type" => type }, [ "body" ] ]
    end
  end

  def headers_for(type, all_html: false, &block)
    Rack::MockRequest.new(described_class.new(app_returning(type, &block), all_html:)).get("/").headers
  end

  it "sets the common security headers on every response, overriding weaker ones" do
    headers = Rack::MockRequest.new(described_class.new(lambda do |_env|
      [ 404, { "content-type" => "text/plain", "x-frame-options" => "SAMEORIGIN" }, [ "x" ] ]
    end)).get("/missing").headers

    expect(headers).to include(
      "x-content-type-options" => "nosniff",
      "x-frame-options" => "DENY",
      "referrer-policy" => "strict-origin-when-cross-origin",
      "cross-origin-opener-policy" => "same-origin",
      "cross-origin-resource-policy" => "same-origin",
      "x-permitted-cross-domain-policies" => "none"
    )
    expect(headers["permissions-policy"]).to include("camera=()", "geolocation=()", "browsing-topics=()")
  end

  it "gives the shell's document the strict policy: same-origin only, no inline code" do
    policy = headers_for("text/html; charset=utf-8") { |env| env[described_class::SHELL_DOCUMENT] = true }["content-security-policy"]

    expect(policy).to eq(described_class::DOCUMENT_POLICY)
    expect(policy).to include("default-src 'self'", "script-src 'self'", "style-src 'self'",
                              "connect-src 'self'", "object-src 'none'", "base-uri 'none'",
                              "frame-ancestors 'none'")
    expect(policy).not_to include("unsafe-inline", "unsafe-eval", "http:", "https:", "*", "data:")
  end

  it "gives JSON (the API, /up) a policy that allows nothing" do
    expect(headers_for("application/json; charset=utf-8")["content-security-policy"])
      .to eq("default-src 'none'; frame-ancestors 'none'")
  end

  it "adds no policy to other files (scripts, styles, fonts, images, the PDF)" do
    %w[text/javascript text/css font/woff2 image/webp application/pdf].each do |type|
      expect(headers_for(type)).not_to have_key("content-security-policy"), type
    end
  end

  it "leaves other HTML (Rails' development error pages) without a policy, except in production" do
    expect(headers_for("text/html")).not_to have_key("content-security-policy")
    expect(headers_for("text/html", all_html: true)["content-security-policy"]).to eq(described_class::DOCUMENT_POLICY)
  end

  describe "with ShellAssets (as in the production image)" do
    let(:root) { Dir.mktmpdir("shell") }
    let(:site) do
      Rack::MockRequest.new(described_class.new(ShellAssets.new(->(_env) { [ 404, {}, [] ] }, root:)))
    end

    before do
      FileUtils.mkdir_p(File.join(root, "assets"))
      File.write(File.join(root, "index.html"), '<div id="root"></div>')
      File.write(File.join(root, "assets", "index-a1.js"), "x")
      File.write(File.join(root, "resume.pdf"), "%PDF")
    end

    after { FileUtils.remove_entry(root) }

    it "puts the document policy on index.html and every page URL, none on files" do
      [ "/", "/index.html", "/pt-br/contact" ].each do |path|
        expect(site.get(path).headers["content-security-policy"]).to eq(described_class::DOCUMENT_POLICY), path
      end
      expect(site.get("/assets/index-a1.js").headers).not_to have_key("content-security-policy")
      expect(site.get("/resume.pdf").headers).not_to have_key("content-security-policy")
      expect(site.get("/assets/index-a1.js").headers["x-frame-options"]).to eq("DENY")
    end
  end
end
