# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_26_121949) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "contact_messages", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.text "message", null: false
    t.string "locale", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_contact_messages_on_created_at"
    t.check_constraint "char_length(message) >= 10 AND char_length(message) <= 5000 AND message ~ '\\S'::text AND message !~ '[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'::text", name: "contact_messages_message_valid"
    t.check_constraint "email::text ~ '^[^@[:space:]]+@[^@[:space:]]+$'::text AND char_length(email::text) <= 254", name: "contact_messages_email_shape"
    t.check_constraint "locale::text = ANY (ARRAY['en'::character varying, 'pt-BR'::character varying]::text[])", name: "contact_messages_locale_allowed"
    t.check_constraint "name::text ~ '\\S'::text AND char_length(name::text) <= 100 AND name::text !~ '[[:cntrl:]]'::text", name: "contact_messages_name_valid"
  end

  create_table "project_links", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.jsonb "label", null: false
    t.string "url", null: false
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "url"], name: "index_project_links_on_project_id_and_url", unique: true
    t.check_constraint "\"position\" >= 0", name: "project_links_position_not_negative"
    t.check_constraint "jsonb_typeof(label) = 'object'::text AND label ?& ARRAY['en'::text, 'pt-BR'::text] AND (label - 'en'::text - 'pt-BR'::text) = '{}'::jsonb AND jsonb_typeof(label -> 'en'::text) = 'string'::text AND jsonb_typeof(label -> 'pt-BR'::text) = 'string'::text AND (label ->> 'en'::text) ~ '\\S'::text AND (label ->> 'pt-BR'::text) ~ '\\S'::text AND char_length(label ->> 'en'::text) <= 60 AND char_length(label ->> 'pt-BR'::text) <= 60", name: "project_links_label_localised"
    t.check_constraint "url::text ~ '^https://[^/?\#@[:space:]]+([/?#]|$)'::text AND url::text !~ '[[:space:]]'::text AND char_length(url::text) <= 2048", name: "project_links_url_https"
  end

  create_table "projects", force: :cascade do |t|
    t.string "slug", null: false
    t.jsonb "name", null: false
    t.jsonb "description", null: false
    t.string "status", null: false
    t.string "technologies", default: [], null: false, array: true
    t.integer "position", default: 0, null: false
    t.boolean "published", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_projects_on_slug", unique: true
    t.check_constraint "\"position\" >= 0", name: "projects_position_not_negative"
    t.check_constraint "array_position(technologies, NULL::character varying) IS NULL", name: "projects_technologies_not_null"
    t.check_constraint "jsonb_typeof(description) = 'object'::text AND description ?& ARRAY['en'::text, 'pt-BR'::text] AND (description - 'en'::text - 'pt-BR'::text) = '{}'::jsonb AND jsonb_typeof(description -> 'en'::text) = 'string'::text AND jsonb_typeof(description -> 'pt-BR'::text) = 'string'::text AND (description ->> 'en'::text) ~ '\\S'::text AND (description ->> 'pt-BR'::text) ~ '\\S'::text AND char_length(description ->> 'en'::text) <= 1000 AND char_length(description ->> 'pt-BR'::text) <= 1000", name: "projects_description_localised"
    t.check_constraint "jsonb_typeof(name) = 'object'::text AND name ?& ARRAY['en'::text, 'pt-BR'::text] AND (name - 'en'::text - 'pt-BR'::text) = '{}'::jsonb AND jsonb_typeof(name -> 'en'::text) = 'string'::text AND jsonb_typeof(name -> 'pt-BR'::text) = 'string'::text AND (name ->> 'en'::text) ~ '\\S'::text AND (name ->> 'pt-BR'::text) ~ '\\S'::text AND char_length(name ->> 'en'::text) <= 120 AND char_length(name ->> 'pt-BR'::text) <= 120", name: "projects_name_localised"
    t.check_constraint "slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text AND char_length(slug::text) <= 64", name: "projects_slug_format"
    t.check_constraint "status::text = ANY (ARRAY['done'::character varying, 'live'::character varying, 'in-progress'::character varying, 'planned'::character varying]::text[])", name: "projects_status_allowed"
  end

  add_foreign_key "project_links", "projects", on_delete: :cascade
end
