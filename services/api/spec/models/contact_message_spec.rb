require "rails_helper"

RSpec.describe ContactMessage do
  subject(:contact_message) { build(:contact_message) }

  def codes_for(attribute)
    contact_message.valid?
    contact_message.errors.details[attribute].pluck(:error)
  end

  it "has a valid factory" do
    expect(contact_message).to be_valid
  end

  describe "name" do
    it "is required" do
      contact_message.name = "   "
      expect(codes_for(:name)).to eq([ :blank ])
    end

    it "has at most 100 characters" do
      contact_message.name = "a" * 100
      expect(contact_message).to be_valid
      contact_message.name = "a" * 101
      expect(codes_for(:name)).to eq([ :too_long ])
    end

    it "is trimmed and its inner whitespace collapsed (newlines too)" do
      contact_message.name = "  Ada \n  Lovelace "
      expect(contact_message.name).to eq("Ada Lovelace")
    end

    it "rejects control characters" do
      contact_message.name = "Ada\u0007Lovelace"
      expect(codes_for(:name)).to eq([ :invalid ])
    end
  end

  describe "email" do
    it "is required" do
      contact_message.email = ""
      expect(codes_for(:email)).to eq([ :blank ])
    end

    it "must look like an email address" do
      %w[ada ada@ @example.com ada@@example.com].each do |email|
        contact_message.email = email
        expect(codes_for(:email)).to eq([ :invalid ]), "expected #{email.inspect} to be rejected"
      end
    end

    it "is trimmed and lowercased" do
      contact_message.email = "  Ada@Example.COM "
      expect(contact_message.email).to eq("ada@example.com")
    end

    it "has at most 254 characters" do
      # Domain labels stay within 63 characters, so only the total length changes.
      domain = ->(first) { "#{'b' * first}.#{'c' * 61}.#{'d' * 61}.com" }
      contact_message.email = "#{'a' * 64}@#{domain.call(61)}"
      expect(contact_message.email.length).to eq(254)
      expect(contact_message).to be_valid
      contact_message.email = "#{'a' * 64}@#{domain.call(62)}"
      expect(codes_for(:email)).to eq([ :too_long ])
    end
  end

  describe "message" do
    it "is required, once" do
      contact_message.message = " \n "
      expect(codes_for(:message)).to eq([ :blank ])
    end

    it "has 10 to 5000 characters" do
      contact_message.message = "a" * 9
      expect(codes_for(:message)).to eq([ :too_short ])
      contact_message.message = "a" * 10
      expect(contact_message).to be_valid
      contact_message.message = "a" * 5000
      expect(contact_message).to be_valid
      contact_message.message = "a" * 5001
      expect(codes_for(:message)).to eq([ :too_long ])
    end

    it "keeps newlines and tabs, normalising Windows line endings" do
      contact_message.message = "  Line one\r\nLine\ttwo  "
      expect(contact_message.message).to eq("Line one\nLine\ttwo")
      expect(contact_message).to be_valid
    end

    it "rejects NUL and other control characters" do
      [ "\u0000", "\u0007", "\u001B", "\u007F" ].each do |character|
        contact_message.message = "Hello there #{character} friend"
        expect(codes_for(:message)).to eq([ :invalid ]), "expected #{character.inspect} to be rejected"
      end
    end
  end

  describe "locale" do
    it "is one of the site's languages" do
      %w[en pt-BR].each do |locale|
        contact_message.locale = locale
        expect(contact_message).to be_valid
      end
      contact_message.locale = "fr"
      expect(codes_for(:locale)).to eq([ :inclusion ])
    end
  end

  describe "scopes" do
    it ".newest_first and .older_than" do
      old = create(:contact_message, created_at: 13.months.ago)
      recent = create(:contact_message, created_at: 1.day.ago)

      expect(described_class.newest_first).to eq([ recent, old ])
      expect(described_class.older_than(described_class::RETENTION.ago)).to eq([ old ])
    end
  end
end
