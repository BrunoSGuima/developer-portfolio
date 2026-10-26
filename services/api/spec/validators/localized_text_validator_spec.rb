require "rails_helper"

RSpec.describe LocalizedTextValidator do
  let(:model_class) do
    Class.new do
      include ActiveModel::Model
      attr_accessor :title

      validates :title, localized_text: { maximum: 10 }

      def self.name = "Example"
    end
  end

  def errors_for(title)
    model = model_class.new(title:)
    model.valid?
    model.errors[:title]
  end

  it "accepts a non-blank text for each language" do
    expect(errors_for({ "en" => "Hello", "pt-BR" => "Olá" })).to be_empty
  end

  it "accepts symbol keys" do
    expect(errors_for({ en: "Hello", "pt-BR": "Olá" })).to be_empty
  end

  it "rejects values that aren't a Hash" do
    expect(errors_for("Hello")).to eq([ "must have a text for each language (en, pt-BR)" ])
    expect(errors_for(nil)).to be_present
  end

  it "names a missing language" do
    expect(errors_for({ "en" => "Hello" })).to eq([ "pt-BR is missing" ])
  end

  it "rejects unsupported languages" do
    expect(errors_for({ "en" => "Hello", "pt-BR" => "Olá", "es" => "Hola" }))
      .to eq([ "es is not a supported language" ])
  end

  it "rejects blank or whitespace-only text" do
    expect(errors_for({ "en" => "Hello", "pt-BR" => " \n" })).to eq([ "pt-BR can't be blank" ])
  end

  it "rejects text that isn't a string" do
    expect(errors_for({ "en" => 42, "pt-BR" => "Olá" })).to eq([ "en must be text" ])
  end

  it "enforces the maximum length per language" do
    expect(errors_for({ "en" => "x" * 11, "pt-BR" => "x" * 10 }))
      .to eq([ "en is too long (maximum is 10 characters)" ])
  end
end
