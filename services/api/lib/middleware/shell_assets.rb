require "rack/files"
require "rack/utils"

# Serves the React shell's production build (apps/shell/dist, built with VITE_APP_MODE=fullstack)
# from the same origin as the API (ADR-0015, Phase 4 Step 4.2). Enabled only when SHELL_ROOT is
# set (the Docker image sets it), so development, test and e2e are unchanged.
#
#   /api, /api/… and /up    always passed to Rails (any method): API errors stay JSON envelopes
#   other methods           passed to Rails (its JSON 404)
#   a file in the build     served; /assets/* (Vite-hashed) cached for a year, index.html
#                           revalidated, other root files (favicons, robots.txt, PDF) for an hour
#   *.map, dot segments,    404, never the shell and never the file
#   server-side names
#   a missing path with     404 (a stale /assets/x.js must not come back as HTML)
#   a file extension
#   any other GET/HEAD      index.html (200): the shell's router renders the page or its 404 page
#
# Only files inside SHELL_ROOT (after resolving symlinks) can ever be served.
class ShellAssets
  CACHE_HASHED = "public, max-age=31536000, immutable".freeze
  CACHE_DOCUMENT = "no-cache".freeze
  CACHE_OTHER = "public, max-age=3600".freeze

  # Rack's table is outdated for these (e.g. application/font-woff2).
  CONTENT_TYPES = {
    ".html" => "text/html; charset=utf-8",
    ".js" => "text/javascript; charset=utf-8",
    ".mjs" => "text/javascript; charset=utf-8",
    ".css" => "text/css; charset=utf-8",
    ".woff2" => "font/woff2",
    ".webmanifest" => "application/manifest+json"
  }.freeze

  # Paths that only make sense on a server (or a leaked checkout): an explicit 404 instead of the
  # shell, even though the shell would expose nothing.
  SENSITIVE_NAMES = %w[gemfile rakefile dockerfile procfile makefile].freeze
  SENSITIVE_DIRECTORIES = %w[app bin config db lib log node_modules services spec storage tmp vendor].freeze

  def initialize(app, root:)
    @app = app
    @root = File.realpath(root)
    @index = File.join(@root, "index.html")
    raise ArgumentError, "SHELL_ROOT has no index.html: #{@root}" unless File.file?(@index)

    @files = Rack::Files.new(@root)
  end

  def call(env)
    path = env["PATH_INFO"].to_s
    return @app.call(env) if rails_path?(path) || !%w[GET HEAD].include?(env["REQUEST_METHOD"])

    segments = segments(path)
    return not_found if segments.nil? || forbidden?(segments)

    file = File.join(@root, *segments)
    if File.symlink?(file) || File.file?(file)
      return not_found unless inside_root?(file)
      return serve(env, segments) if File.file?(file)
    end

    return not_found if sensitive?(segments) || File.extname(segments.last.to_s) != ""

    serve(env, [ "index.html" ])
  end

  private

  def rails_path?(path)
    path == "/api" || path.start_with?("/api/") || path == "/up" || path.start_with?("/up/")
  end

  # The decoded path segments, or nil when the path can't be decoded safely.
  def segments(path)
    decoded = Rack::Utils.unescape_path(path).force_encoding(Encoding::UTF_8)
    return nil unless decoded.valid_encoding?
    return nil if decoded.include?("\0") || decoded.include?("\\")

    decoded.split("/").reject(&:empty?)
  rescue ArgumentError
    nil
  end

  # Dot segments (., .., .env, .git) and source maps are never served or answered with the shell.
  def forbidden?(segments)
    segments.any? { |segment| segment.start_with?(".") } || segments.last.to_s.end_with?(".map")
  end

  def sensitive?(segments)
    SENSITIVE_NAMES.include?(segments.last.to_s.downcase) ||
      SENSITIVE_DIRECTORIES.include?(segments.first.to_s.downcase)
  end

  def inside_root?(file)
    File.realpath(file).start_with?("#{@root}#{File::SEPARATOR}")
  rescue SystemCallError
    false
  end

  def serve(env, segments)
    relative = segments.join("/")
    # The shell's HTML document: SecurityHeaders (outside) gives it the document CSP.
    env[SecurityHeaders::SHELL_DOCUMENT] = true if relative == "index.html"
    status, headers, body = @files.call(env.merge("PATH_INFO" => "/#{relative}"))
    headers = headers.merge(
      "cache-control" => cache_control(relative),
      "x-content-type-options" => "nosniff"
    )
    type = CONTENT_TYPES[File.extname(relative)]
    headers["content-type"] = type if type
    [ status, headers, body ]
  end

  def cache_control(relative)
    return CACHE_HASHED if relative.start_with?("assets/")
    return CACHE_DOCUMENT if relative == "index.html"

    CACHE_OTHER
  end

  def not_found
    [ 404, { "content-type" => "text/plain; charset=utf-8", "x-content-type-options" => "nosniff",
             "cache-control" => CACHE_DOCUMENT }, [ "Not found" ] ]
  end
end
