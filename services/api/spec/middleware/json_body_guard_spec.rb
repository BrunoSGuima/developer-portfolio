require "rails_helper"

# The middleware on its own (Rack::MockRequest), in front of an app that records what reaches it.
RSpec.describe JsonBodyGuard do
  let(:reached) { [] }
  let(:app) do
    lambda do |env|
      reached << { body: env["rack.input"]&.read.to_s, length: env["CONTENT_LENGTH"], type: env["CONTENT_TYPE"] }
      [ 200, {}, [ "app" ] ]
    end
  end
  let(:guard) { Rack::MockRequest.new(described_class.new(app)) }
  let(:path) { "/api/v1/contact_messages" }

  def post_json(body, path: self.path, **env)
    guard.post(path, { input: body, "CONTENT_TYPE" => "application/json" }.merge(env))
  end

  describe "on the contact endpoint" do
    it "passes a JSON object through unchanged" do
      response = post_json('{"name":"Ada"}')

      expect(response.status).to eq(200)
      expect(reached.sole[:body]).to eq('{"name":"Ada"}')
    end

    it "also matches the path with a trailing slash" do
      response = guard.post("#{path}/", input: "plain", "CONTENT_TYPE" => "text/plain")

      expect(response.status).to eq(415)
    end

    it "accepts exactly 32 KB and rejects one byte more" do
      fitting = { message: "a" * (JsonBodyGuard::MAX_BYTES - 14) }.to_json
      expect(fitting.bytesize).to eq(JsonBodyGuard::MAX_BYTES)
      expect(post_json(fitting).status).to eq(200)

      expect(post_json("#{fitting} ").status).to eq(413)
    end

    it "rejects a chunked body without a Content-Length (413)" do
      response = guard.post(path, input: '{"a":1}', "CONTENT_TYPE" => "application/json",
                                  "CONTENT_LENGTH" => nil, "HTTP_TRANSFER_ENCODING" => "chunked")

      expect(response.status).to eq(413)
      expect(reached).to be_empty
    end

    {
      400 => [ "{oops", "application/json" ],
      413 => [ "a" * 40_000, "application/json" ],
      415 => [ "name=Ada", "application/x-www-form-urlencoded" ]
    }.each do |status, (body, type)|
      it "answers #{status} with the JSON error envelope and X-Content-Type-Options: nosniff" do
        response = guard.post(path, input: body, "CONTENT_TYPE" => type)

        expect(response.status).to eq(status)
        expect(response.headers["x-content-type-options"]).to eq("nosniff")
        expect(response.headers["content-type"]).to eq("application/json; charset=utf-8")
        expect(JSON.parse(response.body)).to include("error" => hash_including("code", "message", "details"))
        expect(reached).to be_empty
      end
    end
  end

  describe "on other /api routes" do
    it "discards the body before the app sees it" do
      response = guard.put("/api/v1/projects", input: "{oops", "CONTENT_TYPE" => "application/json")

      expect(response.status).to eq(200)
      expect(reached.sole).to eq(body: "", length: "0", type: nil)
    end

    it "doesn't treat other methods on the contact path as a body route" do
      guard.put(path, input: "name=Ada", "CONTENT_TYPE" => "application/x-www-form-urlencoded")

      expect(reached.sole[:body]).to eq("")
    end
  end

  describe "outside /api, or without a body" do
    it "leaves a request outside /api alone, body included" do
      guard.post("/apix", input: "plain", "CONTENT_TYPE" => "text/plain")

      expect(reached.sole).to eq(body: "plain", length: "5", type: "text/plain")
    end

    it "leaves a request without a body alone" do
      expect(guard.get("/api/v1/projects").status).to eq(200)
      expect(reached.sole[:body]).to eq("")
    end
  end
end
