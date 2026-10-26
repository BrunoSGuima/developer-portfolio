require "rails_helper"

# The contract and the backend must agree on their closed vocabularies (ADR-0012). This compares
# the API with its own document; the shell gets its own check in Phase 3.
RSpec.describe "OpenAPI document" do
  let(:document) { YAML.load_file(Rails.root.join("docs/openapi.yaml")) }
  let(:schemas) { document.dig("components", "schemas") }

  it "lists the same status words as the model" do
    expect(schemas.dig("Status", "enum")).to eq(Project::STATUSES)
  end

  it "lists the same technology ids as the model" do
    expect(schemas.dig("Technology", "enum")).to eq(Project::TECHNOLOGIES)
  end

  it "documents every API route" do
    documented = document["paths"].keys.map { |path| path.gsub(/\{(\w+)\}/, ':\1') }
    routed = Rails.application.routes.routes
                  .map { |route| route.path.spec.to_s.delete_suffix("(.:format)") }
                  .select { |path| path.start_with?("/api/v1/") }
                  .uniq

    expect(routed).to match_array(documented)
  end
end
