# Shared behaviour of every /api controller: the error envelope of ADR-0012,
#   { "error": { "code": "…", "message": "…", "details": { … } } }
# Unexpected exceptions are not rescued here: in production Api::ErrorsController renders them
# (config.exceptions_app), in development Rails shows its detailed error response.
module Api
  class BaseController < ApplicationController
    # JsonBodyGuard rejects bodies that aren't JSON objects first; this is a last safety net.
    rescue_from ActionDispatch::Http::Parameters::ParseError do
      render_error :bad_request, "bad_request", "The request body must be a JSON object"
    end

    # The catch-all route for unknown paths under /api.
    def route_not_found
      render_error :not_found, "not_found", "Not found"
    end

    # Unsupported methods on an existing resource; the route provides the allowed methods.
    # (Read from the route, not params, so a request body is never parsed for a 405.)
    def method_not_allowed
      response.set_header("Allow", request.path_parameters.fetch(:allow))
      render_error :method_not_allowed, "method_not_allowed", "Method not allowed"
    end

    private

    def render_error(status, code, message, details = {})
      render json: ErrorBody.build(code, message, details), status:
    end
  end
end
