# Messages sent through the contact form (Step 2.5, ADR-0013). Minimal personal data: no IP
# address, user agent or referrer. The check constraints mirror ContactMessage's validations.
class CreateContactMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :contact_messages do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.text :message, null: false
      t.string :locale, null: false

      t.timestamps

      # Listing newest first and the retention purge.
      t.index :created_at

      t.check_constraint "name ~ '\\S' AND char_length(name) <= 100 AND name !~ '[[:cntrl:]]'",
                         name: "contact_messages_name_valid"
      t.check_constraint "email ~ '^[^@[:space:]]+@[^@[:space:]]+$' AND char_length(email) <= 254",
                         name: "contact_messages_email_shape"
      # Newlines and tabs are allowed in the message, no other control characters.
      t.check_constraint "char_length(message) BETWEEN 10 AND 5000 AND message ~ '\\S' " \
                         "AND message !~ '[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'",
                         name: "contact_messages_message_valid"
      t.check_constraint "locale IN ('en', 'pt-BR')", name: "contact_messages_locale_allowed"
    end
  end
end
