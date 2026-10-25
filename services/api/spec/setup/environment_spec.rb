require "rails_helper"

# Guards the toolchain and architecture decisions of ADR-0011, so a drift shows up as a failure.
RSpec.describe "Environment" do
  it "runs the Ruby version pinned in .ruby-version" do
    expect(RUBY_VERSION).to eq(Rails.root.join(".ruby-version").read.strip)
  end

  it "runs Rails 8.1" do
    expect(Rails.gem_version.segments.first(2)).to eq([ 8, 1 ])
  end

  it "is an API-only application" do
    expect(Rails.application.config.api_only).to be(true)
  end

  it "has no CORS middleware: the API is served same-origin with the shell" do
    middleware = Rails.application.middleware.map(&:name)

    expect(middleware.grep(/Cors/i)).to be_empty
  end

  it "has FactoryBot loaded with valid factories" do
    expect { FactoryBot.lint }.not_to raise_error
  end
end
