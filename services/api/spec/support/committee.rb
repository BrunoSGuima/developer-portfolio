require "committee"

# Validates request specs against the API contract (docs/openapi.yaml, ADR-0012):
#   assert_schema_conform(200)
# checks that the request matches a documented operation and that the response matches the
# documented schema for that status, error responses included.
module OpenApiContract
  SCHEMA = Committee::Drivers.load_from_file(
    Rails.root.join("docs/openapi.yaml").to_s,
    parser_options: { strict_reference_validation: true }
  )

  # Records every documented path, method and status a request spec has asserted.
  COVERAGE = Committee::Test::SchemaCoverage.new(SCHEMA)

  include Committee::Test::Methods

  def committee_options
    { schema: SCHEMA, schema_coverage: COVERAGE, validate_success_only: false,
      parse_response_by_content_type: true, query_hash_key: "rack.request.query_hash" }
  end

  def request_object
    request
  end

  def response_data
    [ response.status, response.headers, response.body ]
  end

  # Documented responses no request spec has asserted ("METHOD path status").
  def self.uncovered_responses
    COVERAGE.report_flatten[:responses].reject { |entry| entry[:is_covered] }
                                       .map { |entry| "#{entry[:method].upcase} #{entry[:path]} #{entry[:status]}" }
  end

  # Coverage is only meaningful when every request spec ran, unfiltered (not a single file,
  # an -e filter, a line number or a failed run).
  def self.complete_run?
    request_specs = Rails.root.glob("spec/requests/**/*_spec.rb").map(&:to_s)
    files_run = RSpec.configuration.files_to_run.map { |file| File.expand_path(file) }

    (request_specs - files_run).empty? &&
      RSpec.world.filter_manager.inclusions.empty? &&
      RSpec.world.wants_to_quit != true &&
      RSpec.world.all_examples.none? { |example| example.execution_result.status == :failed }
  end
end

RSpec.configure do |config|
  config.include OpenApiContract, type: :request

  # Every documented response must be exercised by a request spec, so the contract can't
  # describe behaviour nothing verifies. Checked only on complete runs (bin/ci, CI).
  config.after(:suite) do
    next unless OpenApiContract.complete_run?

    uncovered = OpenApiContract.uncovered_responses
    next if uncovered.empty?

    raise "docs/openapi.yaml documents responses no request spec asserts:\n  #{uncovered.join("\n  ")}"
  end
end
