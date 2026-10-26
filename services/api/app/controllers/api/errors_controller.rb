# Renders exceptions as the ADR-0012 error envelope when Rails shows "public" exceptions:
# always in production, and in tests for rescuable exceptions (config.exceptions_app in
# config/application.rb). The message is the generic HTTP reason phrase: exception messages and
# backtraces never reach the client. In development Rails shows its detailed error response
# instead (consider_all_requests_local), and the full error is always in the log.
module Api
  class ErrorsController < BaseController
    CODES = { 404 => "not_found", 405 => "method_not_allowed" }.freeze

    def show
      status = request.path_info.delete_prefix("/").to_i
      status = 500 unless (400..599).cover?(status)
      code = CODES.fetch(status) { status < 500 ? "bad_request" : "internal_error" }

      render_error status, code, Rack::Utils::HTTP_STATUS_CODES.fetch(status, "Error")
    end
  end
end
