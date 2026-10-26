# Resets the end-to-end database's mutable state before a Playwright run (bin/e2e-server). It
# deletes data, so it refuses to run anywhere but the e2e environment connected to the e2e
# database.
namespace :e2e do
  E2E_DATABASE = "portfolio_api_e2e".freeze

  desc "Empty the e2e database's contact messages and the e2e rate-limit store (e2e only)"
  task reset: :environment do
    abort "e2e:reset only runs with RAILS_ENV=e2e (got #{Rails.env})." unless Rails.env.e2e?

    database = ActiveRecord::Base.connection.current_database
    abort "e2e:reset only runs against #{E2E_DATABASE} (connected to #{database})." unless database == E2E_DATABASE

    deleted = ContactMessage.delete_all
    Rails.configuration.x.rate_limit_store.clear
    puts "e2e:reset: deleted #{deleted} contact message(s) and cleared the rate-limit store in #{database}."
  end
end
