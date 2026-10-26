# Validates a localised text value (ADR-0012): a Hash with exactly one non-blank string per
# supported locale, like the shell's Localized<string>. Matching check constraints in the
# migrations enforce the same rules in the database.
#
#   validates :name, localized_text: { maximum: 120 }
class LocalizedTextValidator < ActiveModel::EachValidator
  LOCALES = %w[en pt-BR].freeze

  def validate_each(record, attribute, value)
    unless value.is_a?(Hash)
      record.errors.add(attribute, "must have a text for each language (#{LOCALES.join(', ')})")
      return
    end

    keys = value.keys.map(&:to_s)
    (LOCALES - keys).each { |locale| record.errors.add(attribute, "#{locale} is missing") }
    (keys - LOCALES).each { |key| record.errors.add(attribute, "#{key} is not a supported language") }

    LOCALES.each do |locale|
      text = value[locale] || value[locale.to_sym]
      next unless keys.include?(locale)

      if !text.is_a?(String)
        record.errors.add(attribute, "#{locale} must be text")
      elsif text.blank?
        record.errors.add(attribute, "#{locale} can't be blank")
      elsif options[:maximum] && text.length > options[:maximum]
        record.errors.add(attribute, "#{locale} is too long (maximum is #{options[:maximum]} characters)")
      end
    end
  end
end
