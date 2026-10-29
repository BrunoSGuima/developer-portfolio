# A portfolio project (Step 2.3). Text is localised (ADR-0012); every rule here is backed by a
# check constraint or index in the database (db/migrate/*_create_projects.rb).
class Project < ApplicationRecord
  # The status words of the site (shell: content/status.ts); identical in the API.
  STATUSES = %w[done live in-progress planned].freeze

  # Technology ids a project can show as badges (shell: sections/technologies.ts). Labels and
  # colours are presentation and stay in the shell. Becomes an OpenAPI enum in Step 2.4.
  TECHNOLOGIES = %w[react typescript vite react-router vue rails flutter dart rspec bootstrap].freeze

  SLUG_FORMAT = /\A[a-z0-9]+(-[a-z0-9]+)*\z/

  has_many :links, -> { order(:position, :id) },
           class_name: "ProjectLink", inverse_of: :project, dependent: :destroy

  # The slug is the project's public identifier (future /api/v1/projects/:slug URLs).
  attr_readonly :slug

  normalizes :slug, with: ->(slug) { slug.strip.downcase }
  normalizes :name, :description, with: ->(text) { LocalizedText.normalize(text) }

  validates :slug, presence: true, length: { maximum: 64 }, format: { with: SLUG_FORMAT },
                   uniqueness: { case_sensitive: false }
  validates :name, localized_text: { maximum: 120 }
  validates :description, localized_text: { maximum: 1000 }
  validates :status, inclusion: { in: STATUSES }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :published, inclusion: { in: [ true, false ] }
  validate :technologies_are_known_and_unique

  scope :published, -> { where(published: true) }
  scope :ordered, -> { order(:position, :slug) }

  private

  def technologies_are_known_and_unique
    if technologies.nil?
      errors.add(:technologies, "must be a list (it can be empty)")
      return
    end

    unknown = technologies - TECHNOLOGIES
    errors.add(:technologies, "contains unknown ids: #{unknown.join(', ')}") if unknown.any?
    errors.add(:technologies, "contains duplicates") if technologies.uniq.size != technologies.size
  end
end
