# Collects everything Rails logs (requests, parameters, SQL with binds, exceptions) while the
# block runs, at debug level, so specs can prove personal data never reaches the logs.
module LogCapture
  def captured_log
    output = StringIO.new
    logger = ActiveSupport::Logger.new(output, level: :debug)
    Rails.logger.broadcast_to(logger)
    yield
    output.string
  ensure
    Rails.logger.stop_broadcasting_to(logger)
  end
end

RSpec.configure do |config|
  config.include LogCapture
end
