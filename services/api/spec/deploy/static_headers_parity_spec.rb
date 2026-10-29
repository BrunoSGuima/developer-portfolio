require "rails_helper"

# The public static site (Cloudflare Pages, deploy/cloudflare-pages/_headers) must send the same
# security headers and Content Security Policy as the full-stack image (SecurityHeaders,
# ProductionSettings): one policy for both build modes (ADR-0016, Phase 4 Step 4.4).
RSpec.describe "Cloudflare Pages headers match the full-stack image" do
  let(:file) { Rails.root.join("../../deploy/cloudflare-pages/_headers").read }

  # { "/*" => { "content-security-policy" => "…", … }, "/x.pdf" => { "!content-security-policy" => true } }
  let(:rules) do
    file.lines.map(&:chomp).each_with_object({}) do |line, parsed|
      next if line.strip.empty? || line.start_with?("#")

      if line.match?(/\A\S/)
        parsed[line] = {}
      elsif line.strip.start_with?("! ")
        parsed[parsed.keys.last]["!#{line.strip.delete_prefix('! ').downcase}"] = true
      else
        name, value = line.strip.split(": ", 2)
        parsed[parsed.keys.last][name.downcase] = value
      end
    end
  end

  let(:site) { rules.fetch("/*") }

  it "sends the image's document policy on every response" do
    expect(site["content-security-policy"]).to eq(SecurityHeaders::DOCUMENT_POLICY)
  end

  it "sends every security header of the image with the same value" do
    SecurityHeaders::HEADERS.each do |name, value|
      expect(site[name]).to eq(value), name
    end
  end

  it "sends the same HSTS as the image (one day, this host only)" do
    expect(site["strict-transport-security"]).to eq("max-age=#{ProductionSettings::HSTS_MAX_AGE}")
  end

  it "sets nothing else on every response" do
    expected = SecurityHeaders::HEADERS.keys + %w[content-security-policy strict-transport-security]
    expect(site.keys).to match_array(expected)
  end

  it "keeps every *.pages.dev address out of search engines, and nothing else (the domain is indexed)" do
    noindex = rules.select { |_rule, headers| headers.key?("x-robots-tag") }

    expect(noindex).to eq(
      "https://:project.pages.dev/*" => { "x-robots-tag" => "noindex" },
      "https://:version.:project.pages.dev/*" => { "x-robots-tag" => "noindex" }
    )
  end

  it "removes the policy from the résumé PDFs and caches hashed assets for a year, like the image" do
    expect(rules.fetch("/resumes/*")).to eq("!content-security-policy" => true)
    expect(rules.fetch("/assets/*")).to eq("cache-control" => ShellAssets::CACHE_HASHED)
  end
end
