# Portfolio projects (Step 2.3, ADR-0012). The check constraints mirror the model validations so
# the database rejects bad rows even when the models are bypassed.
class CreateProjects < ActiveRecord::Migration[8.1]
  # A localised JSONB column: exactly the keys "en" and "pt-BR", each a non-blank string of at
  # most `maximum` characters (LocalizedTextValidator enforces the same in the model).
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
    create_table :projects do |t|
      t.string :slug, null: false
      t.jsonb :name, null: false
      t.jsonb :description, null: false
      t.string :status, null: false
      t.string :technologies, array: true, null: false, default: []
      t.integer :position, null: false, default: 0
      t.boolean :published, null: false, default: false

      t.timestamps

      t.index :slug, unique: true

      t.check_constraint "slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 64",
                         name: "projects_slug_format"
      t.check_constraint LOCALISED.call("name", 120), name: "projects_name_localised"
      t.check_constraint LOCALISED.call("description", 1000), name: "projects_description_localised"
      t.check_constraint "status IN ('done', 'live', 'in-progress', 'planned')",
                         name: "projects_status_allowed"
      t.check_constraint "array_position(technologies, NULL) IS NULL",
                         name: "projects_technologies_not_null"
      t.check_constraint "position >= 0", name: "projects_position_not_negative"
    end
  end
end
