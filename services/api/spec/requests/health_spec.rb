require "rails_helper"

RSpec.describe "Health check" do
  it "answers GET /up with 200 when the app boots" do
    get "/up"

    expect(response).to have_http_status(:ok)
  end
end
