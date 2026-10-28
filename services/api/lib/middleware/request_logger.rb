# Production request logging (Phase 4 Step 4.3, ADR-0015, ADR-0013): Rails' request logger, minus
# what the logs don't need.
#   - No client IP: "Started GET "/pt-br/contact" at …" (Rails writes "… for <ip> at …").
#     The path stays filtered (request.filtered_path applies filter_parameters to the query).
#   - Static files aren't logged at all: the shell's /assets/* and root files such as favicons,
#     robots.txt and the résumé (any path with a file extension outside /api). Page loads, API
#     calls and errors are still logged; /up is silenced separately (silence_healthcheck_path).
# Contact-message values never reach the logs either way (filter_parameters).
class RequestLogger < Rails::Rack::Logger
  def call(env)
    return @app.call(env) if static_file?(env["PATH_INFO"].to_s)

    super
  end

  private

  def started_request_message(request)
    sprintf('Started %s "%s" at %s', request.raw_request_method, request.filtered_path, Time.now)
  end

  def static_file?(path)
    return false if path == "/api" || path.start_with?("/api/")

    path.start_with?("/assets/") || File.extname(path) != ""
  end
end
