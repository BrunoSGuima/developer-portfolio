require "json"
require "stringio"

# Handles request bodies sent to /api before Rails parses them (ADR-0013).
#
# Only the routes in BODY_ROUTES accept a body (today: POST /api/v1/contact_messages). For them:
#   - the body must be JSON (415 otherwise): this also stops cross-site HTML forms, and a
#     cross-origin JSON request needs a CORS preflight the API never grants;
#   - at most MAX_BYTES with a known length (413 otherwise), so oversized bodies are never parsed;
#   - a JSON object (400 otherwise).
#
# Any other /api request's body is discarded: no other action reads one, so routing answers as
# usual (405 with Allow for unsupported methods, 404 for unknown paths) whatever the body is.
#
# Both run before Rails because Rails parses a body for its parameter log even when no action
# uses it, and logs the raw body at debug level when it fails to parse, which would put a
# visitor's name, email and message into the development log.
class JsonBodyGuard
  MAX_BYTES = 32 * 1024
  BODY_ROUTES = { "/api/v1/contact_messages" => "POST" }.freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)
    return @app.call(env) unless api_path?(request.path_info) && body?(request)
    return @app.call(without_body(env)) unless accepts_body?(request)

    unless request.media_type == "application/json"
      return error(415, "unsupported_media_type", "The request body must be JSON")
    end

    length = request.content_length&.to_i
    if length.nil? || length > MAX_BYTES
      return error(413, "payload_too_large", "The request body is too large")
    end

    body = request.body.read(MAX_BYTES + 1).to_s
    return error(413, "payload_too_large", "The request body is too large") if body.bytesize > MAX_BYTES
    return error(400, "bad_request", "The request body must be a JSON object") unless json_object?(body)

    env["rack.input"] = StringIO.new(body)
    @app.call(env)
  end

  private

  def api_path?(path)
    path == "/api" || path.start_with?("/api/")
  end

  def body?(request)
    request.content_length.to_i.positive? || request.get_header("HTTP_TRANSFER_ENCODING").present?
  end

  def accepts_body?(request)
    path = request.path_info.delete_suffix("/")
    BODY_ROUTES[path] == request.request_method
  end

  def without_body(env)
    env.merge(
      "rack.input" => StringIO.new(""),
      "CONTENT_LENGTH" => "0"
    ).except("CONTENT_TYPE", "HTTP_TRANSFER_ENCODING")
  end

  def json_object?(body)
    JSON.parse(body).is_a?(Hash)
  rescue JSON::ParserError
    false
  end

  # These responses bypass Rails, so they set the security header Rails adds to all others.
  def error(status, code, message)
    body = JSON.generate(Api::ErrorBody.build(code, message))
    headers = { "content-type" => "application/json; charset=utf-8", "x-content-type-options" => "nosniff" }
    [ status, headers, [ body ] ]
  end
end
