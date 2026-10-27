# Read-only query for the end-to-end specs (e2e/support/database.ts): prints, as JSON, the stored
# contact messages whose text contains ARGV[0] (a marker unique to one test). It refuses to run
# anywhere but the e2e environment connected to the e2e database, so it can never read the
# development or test databases.
E2E_DATABASE = "portfolio_api_e2e".freeze

abort "contact_messages.rb only runs with RAILS_ENV=e2e (got #{Rails.env})." unless Rails.env.e2e?
database = ActiveRecord::Base.connection.current_database
abort "contact_messages.rb only reads #{E2E_DATABASE} (connected to #{database})." unless database == E2E_DATABASE

marker = ARGV.fetch(0)
abort "The marker must start with e2e-." unless marker.start_with?("e2e-")

rows = ContactMessage.where("message LIKE ?", "%#{ContactMessage.sanitize_sql_like(marker)}%")
                     .order(:id)
                     .map { |row| row.slice(:name, :email, :message, :locale) }
puts JSON.generate(rows)
