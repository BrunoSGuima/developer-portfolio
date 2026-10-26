require "rails_helper"

# The database must reject bad rows on its own, even when the models are bypassed (update_columns,
# insert_all, raw SQL). Each write runs in a savepoint (requires_new), because a failed statement
# would otherwise abort the example's surrounding transaction.
RSpec.describe "Database constraints" do
  def write(&block)
    ActiveRecord::Base.transaction(requires_new: true, &block)
  end

  let(:valid_text) { { "en" => "Text", "pt-BR" => "Texto" } }

  def project_row(**overrides)
    { slug: "row", name: valid_text, description: valid_text, status: "planned",
      technologies: [], position: 0, published: false }.merge(overrides)
  end

  describe "projects" do
    it "accepts a valid row" do
      expect { write { Project.insert_all!([ project_row ]) } }.to change(Project, :count).by(1)
    end

    {
      "a missing language" => { name: { "en" => "Text" } },
      "an extra key" => { name: { "en" => "Text", "pt-BR" => "Texto", "es" => "Texto" } },
      "blank text" => { name: { "en" => "Text", "pt-BR" => "   " } },
      "non-string text" => { name: { "en" => "Text", "pt-BR" => 1 } },
      "a non-object value" => { name: "Text" },
      "a name over 120 characters" => { name: { "en" => "x" * 121, "pt-BR" => "x" } },
      "a description over 1000 characters" => { description: { "en" => "x", "pt-BR" => "x" * 1001 } },
      "an invalid slug" => { slug: "Bad_Slug" },
      "a slug over 64 characters" => { slug: "a" * 65 },
      "an unknown status" => { status: "in_progress" },
      "a negative position" => { position: -1 },
      "a NULL technology" => { technologies: [ "rails", nil ] }
    }.each do |problem, overrides|
      it "rejects #{problem}" do
        expect { write { Project.insert_all!([ project_row(**overrides) ]) } }
          .to raise_error(ActiveRecord::CheckViolation)
      end
    end

    it "rejects NULL in required columns" do
      expect { write { Project.insert_all!([ project_row(name: nil) ]) } }
        .to raise_error(ActiveRecord::NotNullViolation)
    end

    it "rejects a duplicate slug" do
      create(:project, slug: "taken")
      expect { write { Project.insert_all!([ project_row(slug: "taken") ]) } }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "rejects invalid data written past the validations" do
      project = create(:project)
      expect { write { project.update_columns(status: "unknown") } }
        .to raise_error(ActiveRecord::CheckViolation)
    end
  end

  describe "project_links" do
    let(:project) { create(:project) }

    def link_row(**overrides)
      { project_id: project.id, label: valid_text, url: "https://example.com", position: 0 }
        .merge(overrides)
    end

    it "accepts a valid row" do
      expect { write { ProjectLink.insert_all!([ link_row ]) } }.to change(ProjectLink, :count).by(1)
    end

    [
      "http://example.com", "javascript:alert(1)", "https://", "https://user:pass@example.com",
      "https://example.com/with space", "https://#{'a' * 2048}.com"
    ].each do |url|
      it "rejects the URL #{url[0, 40].inspect}" do
        expect { write { ProjectLink.insert_all!([ link_row(url:) ]) } }
          .to raise_error(ActiveRecord::CheckViolation)
      end
    end

    it "rejects a label over 60 characters" do
      expect { write { ProjectLink.insert_all!([ link_row(label: { "en" => "x" * 61, "pt-BR" => "x" }) ]) } }
        .to raise_error(ActiveRecord::CheckViolation)
    end

    it "rejects a negative position" do
      expect { write { ProjectLink.insert_all!([ link_row(position: -1) ]) } }
        .to raise_error(ActiveRecord::CheckViolation)
    end

    it "rejects the same URL twice on one project" do
      write { ProjectLink.insert_all!([ link_row ]) }
      expect { write { ProjectLink.insert_all!([ link_row ]) } }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "rejects a link to a missing project" do
      expect { write { ProjectLink.insert_all!([ link_row(project_id: -1) ]) } }
        .to raise_error(ActiveRecord::InvalidForeignKey)
    end

    it "is deleted by the database when its project is" do
      write { ProjectLink.insert_all!([ link_row ]) }
      expect { project.delete }.to change(ProjectLink, :count).by(-1)
    end
  end
end
