require "rails_helper"

RSpec.describe ProjectLink do
  subject(:link) { build(:project_link) }

  it "has a valid factory" do
    expect(link).to be_valid
  end

  it "needs a project" do
    link.project = nil
    expect(link).not_to be_valid
  end

  it "needs a label in both languages, at most 60 characters each" do
    link.label = { "en" => "x" * 61, "pt-BR" => "" }
    expect(link).not_to be_valid
    expect(link.errors[:label]).to contain_exactly(
      "en is too long (maximum is 60 characters)", "pt-BR can't be blank"
    )
  end

  describe "url" do
    it "accepts https URLs with a host, path, query or port" do
      %w[https://example.com https://example.com/a/b?c=d#e https://example.com:8443/x].each do |url|
        link.url = url
        expect(link).to be_valid, "expected #{url} to be accepted"
      end
    end

    it "rejects anything that isn't https with a host and no credentials" do
      [
        "http://example.com", "javascript:alert(1)", "ftp://example.com", "https://",
        "https://user:secret@example.com", "//example.com", "example.com", "not a url"
      ].each do |url|
        link.url = url
        expect(link).not_to be_valid, "expected #{url.inspect} to be rejected"
      end
    end

    it "has at most 2048 characters" do
      link.url = "https://example.com/#{'a' * 2048}"
      expect(link).not_to be_valid
    end

    it "is trimmed" do
      link.url = "  https://example.com/x  "
      expect(link.url).to eq("https://example.com/x")
    end

    it "is unique within a project, but may repeat across projects" do
      existing = create(:project_link, url: "https://example.com/same")
      expect(build(:project_link, project: existing.project, url: existing.url)).not_to be_valid
      expect(build(:project_link, url: existing.url)).to be_valid
    end
  end

  it "needs a non-negative integer position" do
    link.position = -1
    expect(link).not_to be_valid
  end
end
