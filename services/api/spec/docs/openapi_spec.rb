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

  it "lists the site's languages as the Locale enum" do
    expect(schemas.dig("Locale", "enum")).to eq(LocalizedText::LOCALES)
  end

  it "documents every validation code a contact message can produce" do
    record = ContactMessage.new(name: "", email: "x", message: "a" * 5001, locale: "xx")
    record.valid?
    record.message = "short"
    record.valid?
    produced = (record.errors.details.values.flatten.pluck(:error).map(&:to_s) + %w[too_long]).uniq

    expect(schemas.dig("ValidationCodes", "items", "enum")).to include(*produced)
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
