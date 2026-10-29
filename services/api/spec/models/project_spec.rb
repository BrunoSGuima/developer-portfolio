require "rails_helper"

RSpec.describe Project do
  subject(:project) { build(:project) }

  it "has a valid factory" do
    expect(project).to be_valid
  end

  describe "slug" do
    it "is required" do
      project.slug = ""
      expect(project).not_to be_valid
      expect(project.errors[:slug]).to include("can't be blank")
    end

    it "is lowercase words separated by single hyphens" do
      %w[my_project -project project- two--hyphens with.dot].each do |slug|
        project.slug = slug
        expect(project).not_to be_valid, "expected #{slug.inspect} to be rejected"
      end
    end

    it "is normalised (trimmed and lowercased)" do
      project.slug = "  My-Project "
      expect(project.slug).to eq("my-project")
    end

    it "has at most 64 characters" do
      project.slug = "a" * 65
      expect(project).not_to be_valid
    end

    it "is unique" do
      create(:project, slug: "taken")
      project.slug = "taken"
      expect(project).not_to be_valid
      expect(project.errors[:slug]).to include("has already been taken")
    end

    it "can't change once the project exists" do
      project.save!
      expect { project.update(slug: "renamed") }.to raise_error(ActiveRecord::ReadonlyAttributeError)
    end
  end

  describe "name and description" do
    it "need a text in both languages" do
      project.name = { "en" => "Only English" }
      expect(project).not_to be_valid
      expect(project.errors.full_messages).to include("Name pt-BR is missing")
    end

    it "are limited to 120 and 1000 characters per language" do
      project.name = { "en" => "x" * 121, "pt-BR" => "x" }
      project.description = { "en" => "x", "pt-BR" => "x" * 1001 }
      expect(project).not_to be_valid
      expect(project.errors.attribute_names).to contain_exactly(:name, :description)
    end

    it "are stored with string keys and trimmed text" do
      project.name = { en: "  Name ", "pt-BR": "Nome" }
      project.save!
      expect(project.reload.name).to eq({ "en" => "Name", "pt-BR" => "Nome" })
    end
  end

  describe "status" do
    it "accepts the site's status words" do
      Project::STATUSES.each do |status|
        project.status = status
        expect(project).to be_valid
      end
    end

    it "rejects anything else" do
      project.status = "in_progress"
      expect(project).not_to be_valid
    end
  end

  describe "technologies" do
    it "keeps the given order" do
      project.update!(technologies: %w[vite react])
      expect(project.reload.technologies).to eq(%w[vite react])
    end

    it "may be empty" do
      project.technologies = []
      expect(project).to be_valid
    end

    it "accepts every technology the shell has a badge for in the API contract (Step 4.7 added four)" do
      project.update!(technologies: %w[flutter dart rspec bootstrap])
      expect(project.reload.technologies).to eq(%w[flutter dart rspec bootstrap])
    end

    it "rejects unknown ids" do
      project.technologies = %w[rails cobol]
      expect(project).not_to be_valid
      expect(project.errors[:technologies]).to include("contains unknown ids: cobol")
    end

    it "rejects duplicates" do
      project.technologies = %w[rails rails]
      expect(project).not_to be_valid
      expect(project.errors[:technologies]).to include("contains duplicates")
    end
  end

  describe "position and published" do
    it "needs a non-negative integer position" do
      project.position = -1
      expect(project).not_to be_valid
    end

    it "is unpublished unless stated" do
      expect(described_class.new.published).to be(false)
    end
  end

  describe "scopes" do
    it ".published leaves out unpublished projects" do
      shown = create(:project)
      create(:project, :unpublished)
      expect(described_class.published).to contain_exactly(shown)
    end

    it ".ordered sorts by position, then slug" do
      third = create(:project, slug: "c", position: 2)
      second = create(:project, slug: "b", position: 1)
      first = create(:project, slug: "a", position: 1)
      expect(described_class.ordered).to eq([ first, second, third ])
    end
  end

  describe "links" do
    it "are ordered by position" do
      project.save!
      late = create(:project_link, project:, position: 5)
      early = create(:project_link, project:, position: 1)
      expect(project.links).to eq([ early, late ])
    end

    it "are deleted with the project" do
      project = create(:project, :with_links)
      expect { project.destroy }.to change(ProjectLink, :count).by(-2)
    end
  end
end
