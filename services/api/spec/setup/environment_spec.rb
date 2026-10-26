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

  # With query log tags Rails turns off prepared statements and writes bind values into the logged
  # SQL, bypassing filter_parameters: contact messages would reach the logs (ADR-0013).
  it "never enables SQL query log tags, in any environment" do
    Rails.root.glob("config/environments/*.rb").each do |file|
      expect(file.read).not_to match(/query_log_tags_enabled\s*=\s*true/), "#{file.basename} enables query log tags"
    end
    expect(ActiveRecord::Base.connection.prepared_statements?).to be(true)
  end

  it "has FactoryBot loaded with valid factories" do
    expect { FactoryBot.lint }.not_to raise_error
  end
end
