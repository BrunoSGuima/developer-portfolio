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

  include Committee::Test::Methods

  def committee_options
    { schema: SCHEMA, validate_success_only: false, parse_response_by_content_type: true,
      query_hash_key: "rack.request.query_hash" }
  end

  def request_object
    request
  end

  def response_data
    [ response.status, response.headers, response.body ]
  end
end

RSpec.configure do |config|
  config.include OpenApiContract, type: :request
end
