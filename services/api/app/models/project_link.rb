# A link on a project card. Only https URLs with a real host and no credentials: the shell renders
# them as <a href>, so javascript: or http: links must never be stored. The database checks the
# URL's shape (see db/migrate/*_create_project_links.rb); this model also parses it.
class ProjectLink < ApplicationRecord
  belongs_to :project, inverse_of: :links

  normalizes :label, with: ->(text) { LocalizedText.normalize(text) }
  normalizes :url, with: ->(url) { url.strip }

  validates :label, localized_text: { maximum: 60 }
  validates :url, presence: true, length: { maximum: 2048 },
                  uniqueness: { scope: :project_id }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :url_is_https

  private

  def url_is_https
    return if url.blank?

    uri = URI.parse(url)
    unless uri.is_a?(URI::HTTPS) && uri.host.present? && uri.userinfo.nil?
      errors.add(:url, "must be an https URL with a host and no credentials")
    end
  rescue URI::InvalidURIError
    errors.add(:url, "is not a valid URL")
  end
end
