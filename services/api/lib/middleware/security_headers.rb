# Security headers on every response (Phase 4 Step 4.3): Rails' own responses, the
# React shell's files (ShellAssets) and early answers such as a blocked host. It sits near the top
# of the stack, inside Rails' SSL middleware (which adds HSTS in production).
#
# The Content Security Policy depends on what the response is:
#   - the shell's HTML document (ShellAssets marks it): DOCUMENT_POLICY. Everything is same-origin
#     and the build has no inline scripts or styles (React's style props use the CSSOM, which
#     style-src doesn't restrict), so no 'unsafe-inline' and no 'unsafe-eval';
#   - JSON (the API, /up): API_POLICY, nothing may load;
#   - other files (JS, CSS, fonts, images, the résumé PDF): no CSP; it has no effect on
#     subresources and can break a browser's built-in PDF viewer.
# In production every HTML response gets DOCUMENT_POLICY. In development and test, Rails' own
# HTML error pages (which use inline styles and scripts) are left alone.
#
# Cloudflare Pages serves the same policy for the static site (Step 4.4): keep them in sync.
class SecurityHeaders
  DOCUMENT_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ").freeze

  API_POLICY = "default-src 'none'; frame-ancestors 'none'".freeze

  HEADERS = {
    "x-content-type-options" => "nosniff",
    "x-frame-options" => "DENY",
    "referrer-policy" => "strict-origin-when-cross-origin",
    "permissions-policy" => "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "cross-origin-opener-policy" => "same-origin",
    "cross-origin-resource-policy" => "same-origin",
    "x-permitted-cross-domain-policies" => "none"
  }.freeze

  # Set by ShellAssets on the shell's HTML document (index.html and the SPA fallback).
  SHELL_DOCUMENT = "security_headers.shell_document".freeze

  def initialize(app, all_html: false)
    @app = app
    @all_html = all_html
  end

  def call(env)
    status, headers, body = @app.call(env)
    HEADERS.each { |name, value| headers[name] = value }
    policy = policy_for(env, headers["content-type"].to_s)
    headers["content-security-policy"] = policy if policy
    [ status, headers, body ]
  end

  private

  def policy_for(env, type)
    if type.start_with?("text/html")
      DOCUMENT_POLICY if env[SHELL_DOCUMENT] || @all_html
    elsif type.include?("json")
      API_POLICY
    end
  end
end
