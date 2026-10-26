# POST /api/v1/contact_messages (Step 2.5, ADR-0013). JsonBodyGuard has already checked that the
# body is a JSON object of at most 32 KB.
#
# Abuse protection, per client IP:
#   - at most ATTEMPTS requests per WINDOW (Rails' rate_limit, counts every request);
#   - at most ACCEPTED accepted messages per WINDOW (counted only when a message is accepted,
#     so a visitor who makes a few validation mistakes isn't locked out);
#   - a honeypot field (`website`) that people never see: when filled, the answer is the normal
#     202 but nothing is stored.
# The responses never contain an id or any submitted value.
module Api
  module V1
    class ContactMessagesController < Api::BaseController
      ATTEMPTS = 20
      ACCEPTED = 5
      WINDOW = 1.hour
      FIELDS = %i[name email message locale].freeze

      # The body is a flat JSON object, not wrapped in "contact_message".
      wrap_parameters false

      rate_limit to: ATTEMPTS, within: WINDOW, only: :create, name: "attempts",
                 store: Rails.configuration.x.rate_limit_store, with: -> { too_many_requests }

      def create
        return too_many_requests if accepted_count >= ACCEPTED

        if params[:website].present?
          count_accepted
          return accepted
        end

        contact_message = ContactMessage.new(params.permit(*FIELDS))
        if contact_message.save
          count_accepted
          accepted
        else
          render_error :unprocessable_content, "validation_failed",
                       "The message could not be sent", error_codes(contact_message)
        end
      # A database error's message can include the row ("Failing row contains (…)"), and both
      # Rails' exception logging and rescue_from's own log line would print it. So it's rescued
      # here and only its class is logged. Validations mirror every constraint, so this
      # shouldn't happen.
      rescue ActiveRecord::StatementInvalid => error
        logger.error("Contact message not stored: #{error.class}")
        render_error :internal_server_error, "internal_error", "Internal Server Error"
      end

      private

      def accepted
        render json: { data: { status: "received" } }, status: :accepted
      end

      def too_many_requests
        response.set_header("Retry-After", WINDOW.to_i.to_s)
        render_error :too_many_requests, "rate_limited", "Too many messages, please try again later"
      end

      # Only the validation codes (blank, too_short, …): errors.details also holds the submitted
      # values, which must never be echoed.
      def error_codes(record)
        record.errors.details.transform_values { |errors| errors.map { |error| error[:error].to_s }.uniq }
      end

      def accepted_count
        rate_limit_store.read(accepted_key).to_i
      end

      def count_accepted
        rate_limit_store.increment(accepted_key, 1, expires_in: WINDOW)
      end

      def accepted_key
        "contact-messages:accepted:#{request.remote_ip}"
      end

      def rate_limit_store
        Rails.configuration.x.rate_limit_store
      end
    end
  end
end
