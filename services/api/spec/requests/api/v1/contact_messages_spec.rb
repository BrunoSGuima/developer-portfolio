require "rails_helper"

RSpec.describe "Contact messages API" do
  let(:path) { "/api/v1/contact_messages" }
  let(:valid) do
    { name: "Ada Lovelace", email: "ada@example.com", message: "Hello! Let's talk about a role.",
      locale: "pt-BR", website: "" }
  end

  def json
    response.parsed_body
  end

  def send_message(body = valid, ip: "203.0.113.10")
    post path, params: body, as: :json, env: { "REMOTE_ADDR" => ip }
  end

  describe "a valid message" do
    it "is stored, normalised, and acknowledged without an id or any submitted value" do
      expect do
        send_message(valid.merge(name: "  Ada  Lovelace ", email: " Ada@Example.com "))
      end.to change(ContactMessage, :count).by(1)

      expect(response).to have_http_status(:accepted)
      expect(json).to eq("data" => { "status" => "received" })
      expect(ContactMessage.last).to have_attributes(
        name: "Ada Lovelace", email: "ada@example.com", locale: "pt-BR",
        message: "Hello! Let's talk about a role."
      )
      assert_schema_conform(202)
    end

    it "ignores fields it doesn't know (no mass assignment)" do
      send_message(valid.merge(id: 999, created_at: "2000-01-01T00:00:00Z", ip: "1.2.3.4"))

      expect(response).to have_http_status(:accepted)
      stored = ContactMessage.last
      expect(stored.id).not_to eq(999)
      expect(stored.created_at).to be > 1.minute.ago
      expect(stored.attributes.keys).not_to include("ip")
    end
  end

  describe "invalid fields" do
    it "answer 422 with validation codes per field, storing nothing and echoing nothing" do
      body = { name: "", email: "not-an-email", message: "tinytext", locale: "xx-YY" }

      expect { send_message(body) }.not_to change(ContactMessage, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json).to eq("error" => {
        "code" => "validation_failed", "message" => "The message could not be sent",
        "details" => { "name" => [ "blank" ], "email" => [ "invalid" ],
                       "message" => [ "too_short" ], "locale" => [ "inclusion" ] }
      })
      expect(response.body).not_to include("not-an-email", "tinytext", "xx-YY")
      assert_response_schema_confirm(422)
    end

    it "answer 422 (never 500) for a NUL byte, which PostgreSQL can't store" do
      expect { send_message(valid.merge(message: "Hello \u0000 there, friend")) }
        .not_to change(ContactMessage, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("message" => [ "invalid" ])
    end

    it "answer 422 when fields are missing or not strings" do
      send_message({ name: [ "Ada" ], email: { a: 1 } })

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details").keys).to contain_exactly("name", "email", "message", "locale")
      assert_response_schema_confirm(422)
    end
  end

  describe "the honeypot" do
    it "answers exactly like a success but stores nothing" do
      send_message
      success = [ response.status, response.body ]

      expect { send_message(valid.merge(website: "https://spam.example")) }
        .not_to change(ContactMessage, :count)

      expect([ response.status, response.body ]).to eq(success)
      assert_schema_conform(202)
    end
  end

  describe "the request body" do
    it "must be JSON (415), so cross-site HTML forms can't post" do
      expect { post path, params: valid, env: { "REMOTE_ADDR" => "203.0.113.10" } }
        .not_to change(ContactMessage, :count)

      expect(response).to have_http_status(:unsupported_media_type)
      expect(json.dig("error", "code")).to eq("unsupported_media_type")
      assert_response_schema_confirm(415)
    end

    it "is rejected as text/plain too" do
      post path, params: valid.to_json, headers: { "CONTENT_TYPE" => "text/plain" }

      expect(response).to have_http_status(:unsupported_media_type)
    end

    it "must be at most 32 KB (413), checked before parsing" do
      expect { send_message(valid.merge(message: "a" * 33_000)) }.not_to change(ContactMessage, :count)

      expect(response).to have_http_status(:content_too_large)
      expect(json.dig("error", "code")).to eq("payload_too_large")
      assert_response_schema_confirm(413)
    end

    [ "{not json", "[1, 2]", "\"text\"" ].each do |body|
      it "must be a JSON object (400 for #{body.inspect})" do
        post path, params: body, headers: { "CONTENT_TYPE" => "application/json" }

        expect(response).to have_http_status(:bad_request)
        expect(json.dig("error", "code")).to eq("bad_request")
        assert_response_schema_confirm(400)
      end
    end
  end

  describe "rate limits (per client IP, per hour)" do
    it "accept at most 5 messages, then answer 429 with Retry-After" do
      5.times { send_message }
      expect(response).to have_http_status(:accepted)

      expect { send_message }.not_to change(ContactMessage, :count)

      expect(response).to have_http_status(:too_many_requests)
      expect(response.headers["Retry-After"]).to eq("3600")
      expect(json.dig("error", "code")).to eq("rate_limited")
      assert_response_schema_confirm(429)
    end

    it "count honeypot submissions as accepted messages" do
      5.times { send_message(valid.merge(website: "spam")) }

      send_message

      expect(response).to have_http_status(:too_many_requests)
    end

    it "don't lock a visitor out after a few validation mistakes" do
      4.times { send_message(valid.merge(email: "typo")) }

      send_message

      expect(response).to have_http_status(:accepted)
    end

    it "cap all attempts at 20, valid or not" do
      20.times { send_message(valid.merge(email: "typo")) }

      send_message

      expect(response).to have_http_status(:too_many_requests)
      expect(ContactMessage.count).to eq(0)
    end

    it "are counted separately for each IP" do
      5.times { send_message(ip: "203.0.113.10") }

      send_message(ip: "203.0.113.20")

      expect(response).to have_http_status(:accepted)
    end

    it "reset after the window" do
      5.times { send_message }

      travel(61.minutes) { send_message }

      expect(response).to have_http_status(:accepted)
    end
  end

  describe "other methods with a body" do
    [ [ "name=x", "application/x-www-form-urlencoded" ], [ "plain text", "text/plain" ] ].each do |body, type|
      %i[put patch delete].each do |verb|
        it "answer #{verb.upcase} with a #{type} body with 405 and Allow: POST (not 415)" do
          process(verb, path, params: body, headers: { "CONTENT_TYPE" => type })

          expect(response).to have_http_status(:method_not_allowed)
          expect(response.headers["Allow"]).to eq("POST")
          assert_response_schema_confirm(405)
        end
      end
    end
  end

  describe "reading messages" do
    %i[get put patch delete].each do |verb|
      it "is impossible: #{verb.upcase} answers 405 with Allow: POST and no data" do
        create(:contact_message, email: "secret@example.com")

        process(verb, path)

        expect(response).to have_http_status(:method_not_allowed)
        expect(response.headers["Allow"]).to eq("POST")
        expect(response.body).not_to include("secret@example.com")
        assert_response_schema_confirm(405)
      end
    end
  end

  # Personal data must never reach the logs: request parameters, SQL bind values or error output.
  describe "privacy in the logs" do
    let(:personal) { { name: "Zelda Privatename", email: "zelda.private@example.com", message: "My private message text" } }

    def expect_no_personal_data(log)
      expect(log).not_to include(personal[:name], personal[:email], personal[:message])
    end

    it "keeps a stored message out of the logs" do
      log = captured_log { send_message(valid.merge(personal)) }

      expect(response).to have_http_status(:accepted)
      expect(log).to include("INSERT INTO \"contact_messages\"", "[FILTERED]")
      expect_no_personal_data(log)
    end

    it "keeps a rejected message out of the logs and the response" do
      log = captured_log { send_message(valid.merge(personal).merge(locale: "xx")) }

      expect(response).to have_http_status(:unprocessable_content)
      expect_no_personal_data(log)
      expect_no_personal_data(response.body)
    end

    it "keeps a malformed body out of the logs (Rails would log the raw body at debug level)" do
      body = "{\"name\": \"#{personal[:name]}\", \"email\": \"#{personal[:email]}\", \"message\": \"#{personal[:message]}\""

      log = captured_log { post path, params: body, headers: { "CONTENT_TYPE" => "application/json" } }

      expect(response).to have_http_status(:bad_request)
      expect_no_personal_data(log)
      expect_no_personal_data(response.body)
    end

    it "keeps a database error, whose message includes the row, out of the logs and the response" do
      allow_any_instance_of(ContactMessage).to receive(:save).and_raise(
        ActiveRecord::CheckViolation, "Failing row contains (1, #{personal[:name]}, #{personal[:email]})"
      )

      log = captured_log { send_message(valid.merge(personal)) }

      expect(response).to have_http_status(:internal_server_error)
      expect(json.dig("error", "code")).to eq("internal_error")
      expect(log).to include("Contact message not stored: ActiveRecord::CheckViolation")
      expect_no_personal_data(log)
      expect_no_personal_data(response.body)
    end

    context "with an unexpected exception, rendered as in production" do
      around do |example|
        env_config = Rails.application.env_config
        original = env_config.slice("action_dispatch.show_exceptions", "action_dispatch.show_detailed_exceptions")
        env_config.merge!("action_dispatch.show_exceptions" => :all,
                          "action_dispatch.show_detailed_exceptions" => false)
        example.run
      ensure
        env_config.merge!(original)
      end

      it "logs and returns no personal data" do
        allow(ContactMessage).to receive(:new).and_raise(RuntimeError, "boom")

        log = captured_log { send_message(valid.merge(personal)) }

        expect(response).to have_http_status(:internal_server_error)
        expect(json).to eq("error" => { "code" => "internal_error", "message" => "Internal Server Error", "details" => {} })
        expect(log).to include("RuntimeError")
        expect_no_personal_data(log)
        expect_no_personal_data(response.body)
      end
    end
  end
end
