# Shared behaviour of every /api controller: the error envelope of ADR-0012,
#   { "error": { "code": "…", "message": "…", "details": { … } } }
# Unexpected exceptions are not rescued here: in production Api::ErrorsController renders them
# (config.exceptions_app), in development Rails shows its detailed error response.
module Api
  class BaseController < ApplicationController
    # The catch-all route for unknown paths under /api.
    def route_not_found
      render_error :not_found, "not_found", "Not found"
    end

    # Unsupported methods on an existing resource; the route provides the allowed methods.
    def method_not_allowed
      response.set_header("Allow", params.fetch(:allow))
      render_error :method_not_allowed, "method_not_allowed", "Method not allowed"
    end

    private

    def render_error(status, code, message, details = {})
      render json: { error: { code:, message:, details: } }, status:
    end
  end
end
