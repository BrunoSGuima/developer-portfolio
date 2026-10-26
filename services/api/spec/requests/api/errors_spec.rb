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

    # Bodies are never a reason to answer differently: the method contract holds for any body.
    {
      "a form body" => [ "name=x", "application/x-www-form-urlencoded" ],
      "a text/plain body" => [ "plain text", "text/plain" ],
      "malformed JSON" => [ "{\"name\": ", "application/json" ],
      "a body over 32 KB" => [ "a" * 40_000, "text/plain" ]
    }.each do |kind, (body, type)|
      %w[/api/v1/projects /api/v1/projects/portfolio].each do |path|
        %i[post put patch delete].each do |verb|
          it "answers #{verb.upcase} #{path} with #{kind} with 405 and Allow" do
            project = create(:project, slug: "portfolio")

            expect { process(verb, path, params: body, headers: { "CONTENT_TYPE" => type }) }
              .not_to change { [ Project.count, project.reload.attributes ] }

            expect(response).to have_http_status(:method_not_allowed)
            expect(response.headers["Allow"]).to eq("GET, HEAD")
            expect(json.dig("error", "code")).to eq("method_not_allowed")
            assert_response_schema_confirm(405)
          end
        end
      end
    end

    it "never parses or logs a body sent to a route that takes none" do
      personal = "Zelda Privatename zelda.private@example.com My private message text"

      log = captured_log do
        put "/api/v1/projects", params: "{\"message\": \"#{personal}\"", headers: { "CONTENT_TYPE" => "application/json" }
      end

      expect(response).to have_http_status(:method_not_allowed)
      expect(log).not_to include("Zelda Privatename", "zelda.private@example.com", "My private message text")
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

    it "answers 404 whatever the body" do
      post "/api/v1/unknown", params: "plain text", headers: { "CONTENT_TYPE" => "text/plain" }

      expect(response).to have_http_status(:not_found)
      expect(json.dig("error", "code")).to eq("not_found")
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

    it "answers 500 the same way for a single project" do
      allow(Project).to receive(:published).and_raise(RuntimeError, "secret internal detail")

      get "/api/v1/projects/portfolio"

      expect(response).to have_http_status(:internal_server_error)
      expect(json.dig("error", "code")).to eq("internal_error")
      expect(response.body).not_to include("secret internal detail")
      assert_schema_conform(500)
    end

    it "answers unknown paths outside /api with the same JSON envelope" do
      get "/no-such-page"

      expect(response).to have_http_status(:not_found)
      expect(json).to eq("error" => { "code" => "not_found", "message" => "Not Found", "details" => {} })
    end
  end

  it "answers contradictory forged forwarding headers normally, not with a crash" do
    get "/api/v1/projects", headers: { "X-Forwarded-For" => "198.51.100.1", "Client-IP" => "198.51.100.2" },
                            env: { "REMOTE_ADDR" => "203.0.113.10" }

    expect(response).to have_http_status(:ok)
  end

  it "leaves the health check alone" do
    get "/up"

    expect(response).to have_http_status(:ok)
  end
end
