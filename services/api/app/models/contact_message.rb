# A message sent through the contact form (Step 2.5, ADR-0013). Minimal personal data: name,
# email, message and the page language; no IP address, user agent or referrer. Every rule is
# also a check constraint (db/migrate/*_create_contact_messages.rb). Messages are deleted after
# RETENTION (bin/rails contact_messages:purge).
class ContactMessage < ApplicationRecord
  RETENTION = 12.months

  # Control characters other than newline and tab (NUL included: PostgreSQL text can't store it).
  MESSAGE_FORBIDDEN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/

  normalizes :name, with: ->(name) { name.squish }
  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :message, with: ->(message) { message.gsub("\r\n", "\n").strip }

  validates :name, presence: true, length: { maximum: 100 }
  validates :name, format: { without: /[[:cntrl:]]/ }, allow_blank: true
  validates :email, presence: true, length: { maximum: 254 }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :message, presence: true
  validates :message, length: { in: 10..5000 }, format: { without: MESSAGE_FORBIDDEN }, allow_blank: true
  validates :locale, inclusion: { in: LocalizedText::LOCALES }

  scope :newest_first, -> { order(created_at: :desc, id: :desc) }
  scope :older_than, ->(time) { where(created_at: ...time) }
end
