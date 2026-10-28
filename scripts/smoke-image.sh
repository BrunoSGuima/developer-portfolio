#!/usr/bin/env bash
# Smoke test of the production image (ADR-0015, Phase 4 Step 4.2), locally and in CI:
#
#   scripts/smoke-image.sh portfolio:local
#
# Needs Docker and a PostgreSQL server reachable from the host network, given by PGHOST, PGPORT,
# PGUSER and PGPASSWORD (locally: the Compose server and infra/.env; in CI: the job's service).
# It works on ONE throwaway database, portfolio_smoke, which it creates and drops itself; it
# refuses any other name, so it can't touch the development, test or e2e databases.
#
# SMOKE_BROWSER=1 also runs the browser smoke (e2e/smoke) against the running container.
set -euo pipefail

IMAGE="${1:?usage: scripts/smoke-image.sh <image>}"
PORT="${SMOKE_PORT:-3999}"
BASE="http://127.0.0.1:${PORT}"
DB="portfolio_smoke"
WEB="portfolio-smoke-web-$$"
PG_IMAGE="postgres:18.6-trixie"
: "${PGHOST:?set PGHOST}" "${PGPORT:?set PGPORT}" "${PGUSER:?set PGUSER}" "${PGPASSWORD:?set PGPASSWORD}"

if [ "$DB" != "portfolio_smoke" ]; then
  echo "Refusing to use database '$DB': only portfolio_smoke is allowed." >&2
  exit 1
fi

failures=0
pass() { echo "  ok    $1"; }
fail() { echo "  FAIL  $1" >&2; failures=$((failures + 1)); }
check() { if eval "$2"; then pass "$1"; else fail "$1"; fi; }

# Secrets reach containers through the environment (-e NAME), never on a command line.
export PGHOST PGPORT PGUSER PGPASSWORD
SECRET_KEY_BASE="$(openssl rand -hex 64)"
export SECRET_KEY_BASE
export DATABASE_URL="postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${DB}"

psql_admin() {
  docker run --rm --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD "$PG_IMAGE" \
    psql -v ON_ERROR_STOP=1 -qAt -d postgres "$@"
}
psql_smoke() {
  docker run --rm --network host -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD "$PG_IMAGE" \
    psql -v ON_ERROR_STOP=1 -qAt -d "$DB" "$@"
}
in_image() { docker run --rm --network host -e DATABASE_URL -e SECRET_KEY_BASE "$IMAGE" "$@"; }

cleanup() {
  docker rm -f "$WEB" >/dev/null 2>&1 || true
  psql_admin -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if curl -s -o /dev/null "$BASE/up"; then
  echo "Port ${PORT} is already in use; set SMOKE_PORT." >&2
  exit 1
fi

echo "== The image (${IMAGE})"
check "runs as a non-root user" '[ "$(docker run --rm "$IMAGE" id -u)" != "0" ]'
check "contains no development gems" \
  '! docker run --rm "$IMAGE" bundle list --name-only | grep -qE "^(rspec|rspec-rails|rubocop|debug|dotenv|committee|brakeman|factory_bot|bundler-audit)$"'
check "contains no Node, node_modules or specs" \
  '! docker run --rm "$IMAGE" sh -c "command -v node || ls -d /rails/node_modules /rails/spec" 2>/dev/null | grep -q .'
check "contains no secrets (.env, master key, credentials)" \
  '! docker run --rm "$IMAGE" sh -c "ls /rails/.env* /rails/config/master.key /rails/config/credentials.yml.enc" 2>/dev/null | grep -q .'
check "contains no source maps in the shell" \
  '[ -z "$(docker run --rm "$IMAGE" find /rails/shell -name "*.map")" ]'
check "the shell is the full-stack build (its bundle calls /api/v1)" \
  'docker run --rm "$IMAGE" sh -c "grep -l /api/v1 /rails/shell/assets/*.js" | grep -q .'

echo "== The release command"
# A failing migration step (here: no database server at all) must stop the release before the
# seeds, with a non-zero exit. (A missing database is not a failure: db:migrate creates it.)
check "fails fast when migrating fails (non-zero exit, seeds never run)" \
  '! DATABASE_URL="postgres://smoke:smoke@127.0.0.1:1/${DB}" in_image bin/release > "${TMPDIR:-/tmp}/smoke-release-$$.log" 2>&1 && ! grep -q "migrations and seeds applied" "${TMPDIR:-/tmp}/smoke-release-$$.log"'
rm -f "${TMPDIR:-/tmp}/smoke-release-$$.log"
psql_admin -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null
psql_admin -c "CREATE DATABASE ${DB}" >/dev/null
check "migrates and seeds as the non-root user" 'in_image bin/release | grep -q "migrations and seeds applied"'
check "the database has the seeded project" '[ "$(psql_smoke -c "SELECT count(*) FROM projects")" -ge 1 ]'

echo "== The web service (Puma only; no migrations on start)"
docker run -d --name "$WEB" --network host -e DATABASE_URL -e SECRET_KEY_BASE -e PORT="$PORT" "$IMAGE" >/dev/null
for _ in $(seq 1 60); do curl -fs -o /dev/null "$BASE/up" && break; sleep 1; done
check "is up (/up 200)" '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/up")" = 200 ]'
check "logs no migration on start" '! docker logs "$WEB" 2>&1 | grep -qi "migrat"'

status() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
header() { curl -s -D - -o /dev/null "$2" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
body() { curl -s "$@"; }

echo "== The shell (single origin)"
for path in / /pt-br/contact /about /does-not-exist; do
  check "GET $path → the shell (200, no-cache)" \
    '[ "$(status "$BASE$path")" = 200 ] && body "$BASE$path" | grep -q "<div id=\"root\"></div>" && [ "$(header cache-control "$BASE$path")" = "no-cache" ]'
done
check "HEAD / → 200 without a body" '[ "$(curl -s -I -o /dev/null -w "%{http_code}" "$BASE/")" = 200 ] && [ -z "$(curl -s -I "$BASE/" -o - | tr -d "\r" | sed "1,/^$/d")" ]'
check "HSTS on shell responses" '[ -n "$(header strict-transport-security "$BASE/")" ]'

INDEX="$(body "$BASE/")"
JS="$(grep -o '/assets/[^"]*\.js' <<<"$INDEX" | head -1)"
CSS="$(grep -o '/assets/[^"]*\.css' <<<"$INDEX" | head -1)"
FONT="$(body "$BASE$CSS" | grep -o '/assets/[^)]*\.woff2' | head -1)"
IMAGE_FILE="$(docker exec "$WEB" sh -c 'ls /rails/shell/assets | grep "\.webp$" | head -1')"
for pair in "$JS|text/javascript; charset=utf-8" "$CSS|text/css; charset=utf-8" \
            "$FONT|font/woff2" "/assets/$IMAGE_FILE|image/webp"; do
  path="${pair%%|*}"; type="${pair#*|}"
  check "GET $path → $type, immutable" \
    '[ "$(status "$BASE$path")" = 200 ] && [ "$(header content-type "$BASE$path")" = "$type" ] && [ "$(header cache-control "$BASE$path")" = "public, max-age=31536000, immutable" ]'
done
check "a root file (robots.txt) is cached for an hour" '[ "$(header cache-control "$BASE/robots.txt")" = "public, max-age=3600" ]'
check "a conditional request revalidates (304)" \
  '[ "$(status -H "If-Modified-Since: $(header last-modified "$BASE$JS")" "$BASE$JS")" = 304 ]'
for path in /assets/missing-0000.js "${JS}.map" /assets/x.css.map /favicon.ico; do
  check "GET $path → 404, not the shell" '[ "$(status "$BASE$path")" = 404 ] && ! body "$BASE$path" | grep -q "id=\"root\""'
done
for path in /.env /.git/config /Gemfile /Gemfile.lock /config/database.yml /config/master.key \
            /app/models/project.rb /db/seeds.rb /%2e%2e/%2e%2e/etc/passwd /..%2f..%2fetc/passwd; do
  check "GET $path → 404 (no private content)" \
    '[ "$(status "$BASE$path")" = 404 ] && ! body "$BASE$path" | grep -qiE "(source \"https://rubygems|production:|root:x:0|secret_key)"'
done

echo "== The API"
check "GET /api/v1/projects → the seeded project (JSON)" \
  '[ "$(status "$BASE/api/v1/projects")" = 200 ] && body "$BASE/api/v1/projects" | grep -q "\"slug\":\"developer-portfolio\""'
check "GET /api/v1/nope → JSON 404 envelope, not the shell" \
  '[ "$(status "$BASE/api/v1/nope")" = 404 ] && body "$BASE/api/v1/nope" | grep -q "\"code\":\"not_found\""'
check "GET /api/v1/x.js → JSON 404, not the shell" 'body "$BASE/api/v1/x.js" | grep -q "\"code\":\"not_found\""'
check "POST /api/v1/projects → 405 with Allow" \
  '[ "$(status -X POST "$BASE/api/v1/projects")" = 405 ] && [ "$(curl -s -D - -o /dev/null -X POST "$BASE/api/v1/projects" | tr -d "\r" | grep -i "^allow:" | cut -d" " -f2-)" = "GET, HEAD" ]'
check "POST /pt-br/contact → Rails JSON 404 (other methods are not the shell)" \
  'body -X POST "$BASE/pt-br/contact" | grep -q "\"code\":\"not_found\""'
check "a valid contact message → 202, stored" \
  '[ "$(status -X POST -H "Content-Type: application/json" -d "{\"name\":\"Smoke Test\",\"email\":\"smoke@example.com\",\"message\":\"A smoke-test message.\",\"locale\":\"en\"}" "$BASE/api/v1/contact_messages")" = 202 ] && [ "$(psql_smoke -c "SELECT count(*) FROM contact_messages")" = 1 ]'
check "an invalid contact message → 422 JSON, not stored" \
  '[ "$(status -X POST -H "Content-Type: application/json" -d "{\"name\":\"\",\"email\":\"x\",\"message\":\"short\",\"locale\":\"en\"}" "$BASE/api/v1/contact_messages")" = 422 ] && [ "$(psql_smoke -c "SELECT count(*) FROM contact_messages")" = 1 ]'

if [ "${SMOKE_BROWSER:-0}" = "1" ]; then
  echo "== Browser smoke (e2e/smoke)"
  if SMOKE_BASE_URL="$BASE" npx playwright test -c e2e/playwright.smoke.config.ts; then
    pass "browser smoke"
  else
    fail "browser smoke"
  fi
fi

echo
if [ "$failures" -gt 0 ]; then
  echo "Smoke test: ${failures} check(s) failed." >&2
  docker logs --tail 50 "$WEB" >&2 || true
  exit 1
fi
echo "Smoke test: all checks passed."
