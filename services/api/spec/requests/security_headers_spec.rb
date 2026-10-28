require "rails_helper"

# SecurityHeaders in the app's own middleware stack (first, before host authorization and SSL).
RSpec.describe "Security headers on the API" do
  it "covers the API's JSON responses, errors included" do
    get "/api/v1/nope"

    expect(response).to have_http_status(:not_found)
    expect(response.headers["content-security-policy"]).to eq(SecurityHeaders::API_POLICY)
    expect(response.headers["x-frame-options"]).to eq("DENY")
    expect(response.headers["cross-origin-resource-policy"]).to eq("same-origin")
  end

  it "covers the health check" do
    get "/up"

    expect(response.headers["content-security-policy"]).to eq(SecurityHeaders::API_POLICY)
  end
end
