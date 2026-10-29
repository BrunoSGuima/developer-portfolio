require "ipaddr"
require "json"
require "active_support/core_ext/integer/time"

# Parses and validates the production settings that guard the edge of the app (Phase 4 Step 4.3),
# so a misconfigured deploy fails at boot instead of running unprotected.
#
#   ALLOWED_HOSTS     required: the exact hostnames the site answers to, comma-separated
#                     (e.g. "portfolio-xyz.onrender.com,example.dev"). No wildcards or leading
#                     dots (".onrender.com" would accept any other tenant's hostname), no ports,
#                     schemes or paths. IPv4 literals are allowed (local smoke tests).
#   TRUSTED_PROXIES   optional: the proxies whose forwarded headers are believed (IPs or CIDRs,
#                     comma-separated). When set it replaces Rails' default list (loopback and
#                     private networks); the production value must be verified on the host
#                     before any public deployment (ADR-0016).
module ProductionSettings
  class Error < StandardError; end

  # HSTS max-age for the first deployment: one day (revisited only with a custom domain, ROADMAP backlog).
  HSTS_MAX_AGE = 1.day.to_i

  # Host authorization: /up is exempt (platform health checks use internal addresses).
  HOST_CHECK_EXCLUDED = ->(request) { request.path == "/up" }

  # A blocked host gets the API's error envelope, without the list of allowed hosts.
  BLOCKED_HOST_RESPONSE = lambda do |_env|
    body = JSON.generate({ error: { code: "forbidden_host", message: "Forbidden", details: {} } })
    [ 403, { "content-type" => "application/json; charset=utf-8", "cache-control" => "no-store" }, [ body ] ]
  end

  LABEL = /[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?/
  HOSTNAME = /\A(?=.{1,253}\z)#{LABEL}(?:\.#{LABEL})*\z/

  module_function

  def allowed_hosts(value)
    raise Error, "ALLOWED_HOSTS is required in production (the site's exact hostnames, comma-separated)." if value.to_s.strip.empty?

    value.split(",", -1).map do |entry|
      host = entry.strip.downcase
      numeric = host.match?(/\A[\d.]+\z/)
      unless numeric ? ipv4?(host) : HOSTNAME.match?(host)
        raise Error, "ALLOWED_HOSTS has an invalid entry #{entry.strip.inspect}: use exact hostnames only (no wildcards, leading dots, ports, schemes or paths)."
      end

      host
    end
  end

  def trusted_proxies(value)
    return nil if value.nil? || value.strip.empty?

    value.split(",", -1).map do |entry|
      IPAddr.new(entry.strip)
    rescue IPAddr::Error, ArgumentError
      raise Error, "TRUSTED_PROXIES has an invalid entry #{entry.strip.inspect}: use IP addresses or CIDR ranges."
    end
  end

  def ipv4?(host)
    host.match?(/\A\d{1,3}(?:\.\d{1,3}){3}\z/) && IPAddr.new(host).ipv4?
  rescue IPAddr::Error
    false
  end
end
