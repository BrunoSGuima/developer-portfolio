# Normalisation for localised JSONB values (ADR-0012). JSONB written with symbol keys keeps them
# in memory until the record is reloaded, so keys become strings and texts are stripped before
# validation and saving. Anything that isn't a Hash is left for LocalizedTextValidator to reject.
module LocalizedText
  # The site's languages (the shell's i18n/locales.ts); also the OpenAPI Locale enum.
  LOCALES = %w[en pt-BR].freeze

  def self.normalize(value)
    return value unless value.is_a?(Hash)

    value.to_h { |locale, text| [ locale.to_s, text.is_a?(String) ? text.strip : text ] }
  end
end
