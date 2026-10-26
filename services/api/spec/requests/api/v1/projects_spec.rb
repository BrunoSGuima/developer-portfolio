require "rails_helper"

RSpec.describe "Projects API" do
  # Not memoised: several examples make more than one request.
  def json
    response.parsed_body
  end

  describe "GET /api/v1/projects" do
    it "lists only published projects, ordered by position then slug" do
      create(:project, slug: "zeta", position: 0)
      create(:project, slug: "beta", position: 1)
      create(:project, slug: "alpha", position: 1)
      create(:project, :unpublished, slug: "hidden", position: 0)

      get "/api/v1/projects"

      expect(response).to have_http_status(:ok)
      expect(json["data"].pluck("slug")).to eq(%w[zeta alpha beta])
      assert_schema_conform(200)
    end

    it "returns each project with both languages, technologies and ordered links" do
      project = create(:project, slug: "portfolio", status: "in-progress",
                                 technologies: %w[vite react])
      create(:project_link, project:, url: "https://example.com/second", position: 2)
      create(:project_link, project:, url: "https://example.com/first", position: 1)

      get "/api/v1/projects"

      expect(json["data"].sole).to eq(
        "slug" => "portfolio",
        "name" => { "en" => "Example project", "pt-BR" => "Projeto de exemplo" },
        "description" => { "en" => "What the project is about.", "pt-BR" => "Do que se trata o projeto." },
        "status" => "in-progress",
        "technologies" => %w[vite react],
        "links" => [
          { "label" => { "en" => "Source code", "pt-BR" => "Código-fonte" }, "url" => "https://example.com/first" },
          { "label" => { "en" => "Source code", "pt-BR" => "Código-fonte" }, "url" => "https://example.com/second" }
        ]
      )
      assert_schema_conform(200)
    end

    it "returns an empty list when nothing is published" do
      create(:project, :unpublished)

      get "/api/v1/projects"

      expect(json).to eq("data" => [])
      expect(response.media_type).to eq("application/json")
      assert_schema_conform(200)
    end

    it "loads the links of every project in one query" do
      create_list(:project, 3, :with_links)
      queries = []
      counter = ->(*, payload) { queries << payload[:sql] unless payload[:name] == "SCHEMA" }

      ActiveSupport::Notifications.subscribed(counter, "sql.active_record") { get "/api/v1/projects" }

      expect(json["data"].size).to eq(3)
      expect(queries.size).to eq(2)
    end
  end

  describe "GET /api/v1/projects/:slug" do
    it "returns a published project in the same shape as the list" do
      create(:project, :with_links, slug: "portfolio")

      get "/api/v1/projects"
      listed = json["data"].sole

      get "/api/v1/projects/portfolio"

      expect(response).to have_http_status(:ok)
      expect(json["data"]).to eq(listed)
      assert_schema_conform(200)
    end

    it "answers 404 for an unpublished project, exactly as for an unknown one" do
      create(:project, :unpublished, slug: "secret")

      get "/api/v1/projects/secret"
      unpublished = [ response.status, response.body ]
      assert_schema_conform(404)

      get "/api/v1/projects/no-such-project"

      expect([ response.status, response.body ]).to eq(unpublished)
      expect(json).to eq("error" => { "code" => "not_found", "message" => "Project not found", "details" => {} })
      assert_schema_conform(404)
    end

    [ "Portfolio", "bad_slug", "a" * 65, "%20" ].each do |slug|
      it "answers 404 for the badly formed slug #{slug[0, 20].inspect}" do
        create(:project, slug: "portfolio")

        get "/api/v1/projects/#{slug}"

        expect(response).to have_http_status(:not_found)
        expect(json.dig("error", "code")).to eq("not_found")
        assert_schema_conform(404)
      end
    end
  end

  # Rails would otherwise read "valid-slug.json" as slug "valid-slug" plus a format; the routes
  # use format: false, so the whole segment is the slug and only canonical slugs match.
  describe "dots in the URL (no format suffixes)" do
    before do
      create(:project, slug: "valid-slug")
      create(:project, slug: "a")
    end

    it "serves the canonical URL" do
      get "/api/v1/projects/valid-slug"

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "slug")).to eq("valid-slug")
      assert_schema_conform(200)
    end

    %w[valid-slug.json valid-slug.anything a.b].each do |segment|
      it "answers 404 for /api/v1/projects/#{segment}, even though a published project matches the part before the dot" do
        get "/api/v1/projects/#{segment}"

        expect(response).to have_http_status(:not_found)
        expect(json).to eq("error" => { "code" => "not_found", "message" => "Project not found", "details" => {} })
        assert_schema_conform(404)
      end
    end

    it "answers other methods on a dotted slug with 405, like any other slug" do
      post "/api/v1/projects/a.b"

      expect(response).to have_http_status(:method_not_allowed)
      expect(response.headers["Allow"]).to eq("GET, HEAD")
    end

    it "has no format suffix on the list either" do
      get "/api/v1/projects.json"

      expect(response).to have_http_status(:not_found)
      expect(json.dig("error", "code")).to eq("not_found")
    end
  end

  describe "contract" do
    it "detects drift: a response field the document doesn't describe fails validation" do
      create(:project)
      allow(ProjectSerializer).to receive(:call).and_wrap_original do |original, project|
        original.call(project).merge(internal_id: project.id)
      end

      get "/api/v1/projects"

      expect { assert_schema_conform(200) }.to raise_error(Committee::InvalidResponse)
    end

    it "detects drift: a missing required field fails validation" do
      create(:project)
      allow(ProjectSerializer).to receive(:call).and_wrap_original do |original, project|
        original.call(project).except(:status)
      end

      get "/api/v1/projects"

      expect { assert_schema_conform(200) }.to raise_error(Committee::InvalidResponse)
    end
  end
end
