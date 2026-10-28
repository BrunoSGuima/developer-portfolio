require "rails_helper"

# GET /up (HealthController): healthy only when PostgreSQL answers; never any error details.
RSpec.describe "Health check" do
  it "answers 200 when the database answers, never cached" do
    get "/up"

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq("status" => "ok")
    expect(response.headers["cache-control"]).to eq("no-store")
  end

  [ ActiveRecord::ConnectionNotEstablished.new("connection to server at 10.0.0.5 (secret) failed"),
    ActiveRecord::ConnectionTimeoutError.new("could not obtain a connection"),
    PG::ConnectionBad.new("password authentication failed for user portfolio") ].each do |error|
    it "answers 503 without details when the database fails (#{error.class})" do
      allow(ActiveRecord::Base.connection_pool).to receive(:with_connection).and_raise(error)

      log = captured_log { get "/up" }

      expect(response).to have_http_status(:service_unavailable)
      expect(response.parsed_body).to eq("status" => "unavailable")
      expect(response.headers["cache-control"]).to eq("no-store")
      expect(response.body).not_to include(error.message)
      expect(log).to include("Health check failed: #{error.class}")
      expect(log).not_to include(error.message)
    end
  end
end
