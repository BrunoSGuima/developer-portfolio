# GET /up (Phase 4 Step 4.3): the health check platforms call before routing traffic to an
# instance and while it runs. Healthy only when the app can reach PostgreSQL (a pooled connection
# and SELECT 1, bounded by the production connect_timeout), so a deploy whose database is
# unreachable never goes live. The response never contains error details; the failure is logged
# by exception class only (error-level lines still pass the /up log silencing).
class HealthController < ActionController::API
  def show
    response.headers["cache-control"] = "no-store"
    ActiveRecord::Base.connection_pool.with_connection { |connection| connection.select_value("SELECT 1") }
    render json: { status: "ok" }
  rescue StandardError => error
    logger.error("Health check failed: #{error.class}")
    render json: { status: "unavailable" }, status: :service_unavailable
  end
end
