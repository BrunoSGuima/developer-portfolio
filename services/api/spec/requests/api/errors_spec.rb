require "rails_helper"

RSpec.describe "API errors" do
  def json
    response.parsed_body
  end

  describe "unsupported methods on existing resources" do
    %w[/api/v1/projects /api/v1/projects/portfolio].each do |path|
      %i[post put patch delete].each do |verb|
        it "answers #{verb.upcase} #{path} with 405 and an Allow header, changing nothing" do
          project = create(:project, slug: "portfolio")

          expect { process(verb, path, params: { slug: "changed" }, as: :json) }
            .not_to change { [ Project.count, project.reload.attributes ] }

          expect(response).to have_http_status(:method_not_allowed)
          expect(response.headers["Allow"]).to eq("GET, HEAD")
          expect(json).to eq("error" => { "code" => "method_not_allowed",
                                          "message" => "Method not allowed", "details" => {} })
          assert_response_schema_confirm(405)
        end
      end
    end

    it "still answers HEAD like GET" do
      head "/api/v1/projects"

      expect(response).to have_http_status(:ok)
    end
  end

  describe "unknown paths under /api" do
    %w[/api /api/v1 /api/v1/unknown /api/v2/projects /api/v1/projects/a/b].each do |path|
      it "answers #{path} with the JSON 404" do
        get path

        expect(response).to have_http_status(:not_found)
        expect(json).to eq("error" => { "code" => "not_found", "message" => "Not found", "details" => {} })
      end
    end

    it "answers 404 for any method" do
      delete "/api/v1/unknown"

      expect(response).to have_http_status(:not_found)
    end
  end

  # Production behaviour: Rails renders exceptions with config.exceptions_app (Api::ErrorsController).
  # Development shows Rails' detailed error response instead (consider_all_requests_local).
  describe "unexpected errors, as in production" do
    around do |example|
      env_config = Rails.application.env_config
      original = env_config.slice("action_dispatch.show_exceptions", "action_dispatch.show_detailed_exceptions")
      env_config.merge!("action_dispatch.show_exceptions" => :all,
                        "action_dispatch.show_detailed_exceptions" => false)
      example.run
    ensure
      env_config.merge!(original)
    end

    it "answers 500 with a generic message and no exception details" do
      allow(Project).to receive(:published).and_raise(RuntimeError, "secret internal detail")

      get "/api/v1/projects"

      expect(response).to have_http_status(:internal_server_error)
      expect(json).to eq("error" => { "code" => "internal_error",
                                      "message" => "Internal Server Error", "details" => {} })
      expect(response.body).not_to include("secret internal detail")
      expect(response.body).not_to include("projects_controller")
      assert_schema_conform(500)
    end

    it "answers unknown paths outside /api with the same JSON envelope" do
      get "/no-such-page"

      expect(response).to have_http_status(:not_found)
      expect(json).to eq("error" => { "code" => "not_found", "message" => "Not Found", "details" => {} })
    end
  end

  it "leaves the health check alone" do
    get "/up"

    expect(response).to have_http_status(:ok)
  end
end
