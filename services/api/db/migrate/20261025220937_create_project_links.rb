# Links shown on a project card (Step 2.3). URL checks are split between the layers:
# ProjectLink parses the URL (https scheme, a valid host, no credentials); the database only
# guarantees its shape (https, a non-empty authority without "user@", no whitespace, length), so
# it can't hold javascript:, http: or credential-bearing links even if the model is bypassed.
class CreateProjectLinks < ActiveRecord::Migration[8.1]
  # Same rules as projects.name (see CreateProjects): "en" and "pt-BR", non-blank, bounded.
  LOCALISED = lambda do |column, maximum|
    <<~SQL.squish
      jsonb_typeof(#{column}) = 'object'
      AND #{column} ?& ARRAY['en', 'pt-BR']
      AND #{column} - 'en' - 'pt-BR' = '{}'::jsonb
      AND jsonb_typeof(#{column} -> 'en') = 'string'
      AND jsonb_typeof(#{column} -> 'pt-BR') = 'string'
      AND (#{column} ->> 'en') ~ '\\S'
      AND (#{column} ->> 'pt-BR') ~ '\\S'
      AND char_length(#{column} ->> 'en') <= #{maximum}
      AND char_length(#{column} ->> 'pt-BR') <= #{maximum}
    SQL
  end

  def change
    create_table :project_links do |t|
      # The unique [project_id, url] index below also serves foreign-key lookups.
      t.references :project, null: false, index: false, foreign_key: { on_delete: :cascade }
      t.jsonb :label, null: false
      t.string :url, null: false
      t.integer :position, null: false, default: 0

      t.timestamps

      t.index %i[project_id url], unique: true

      t.check_constraint LOCALISED.call("label", 60), name: "project_links_label_localised"
      t.check_constraint "url ~ '^https://[^/?#@[:space:]]+([/?#]|$)' " \
                         "AND url !~ '[[:space:]]' AND char_length(url) <= 2048",
                         name: "project_links_url_https"
      t.check_constraint "position >= 0", name: "project_links_position_not_negative"
    end
  end
end
