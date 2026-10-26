# Reading and deleting contact messages (ADR-0013). They run only when invoked: nothing prints
# messages at startup or in CI.
namespace :contact_messages do
  desc "Show recent contact messages, newest first (PERSONAL DATA). LIMIT=20, SINCE=YYYY-MM-DD"
  task list: :environment do
    limit = Integer(ENV.fetch("LIMIT", "20"))
    messages = ContactMessage.newest_first.limit(limit)
    messages = messages.where(created_at: Date.iso8601(ENV["SINCE"]).beginning_of_day..) if ENV["SINCE"]

    puts "Contact messages contain personal data (names, email addresses, messages)."
    puts "Don't copy or share this output; messages are deleted after 12 months.\n\n"
    if messages.empty?
      puts "No messages."
    else
      messages.each do |message|
        puts "#{message.created_at.utc.iso8601} [#{message.locale}] #{message.name} <#{message.email}>"
        puts message.message.gsub(/^/, "  ")
        puts
      end
      puts "Showing #{messages.size} (newest first, at most #{limit})."
    end
  end

  desc "Delete contact messages older than the retention period (12 months). DRY_RUN=1 only counts"
  task purge: :environment do
    expired = ContactMessage.older_than(ContactMessage::RETENTION.ago)

    if ENV["DRY_RUN"].present?
      puts "#{expired.count} contact message(s) older than 12 months would be deleted."
    else
      puts "Deleted #{expired.delete_all} contact message(s) older than 12 months."
    end
  end
end
