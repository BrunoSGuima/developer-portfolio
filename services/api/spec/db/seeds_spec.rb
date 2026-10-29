require "rails_helper"

# db/seeds.rb against its own expectations only (it never reads the shell's TypeScript).
RSpec.describe "Seeds" do
  def load_seeds
    Rails.application.load_seed
  end

  it "creates the published portfolio project in both languages, with its link" do
    load_seeds

    project = Project.find_by!(slug: "developer-portfolio")
    expect(project).to be_published
    expect(project.name.keys).to contain_exactly("en", "pt-BR")
    expect(project.links.map(&:url)).to eq([ "https://github.com/BrunoSGuima/developer-portfolio" ])
  end

  it "creates the three published projects in display order" do
    load_seeds

    expect(Project.published.ordered.pluck(:slug))
      .to eq(%w[developer-portfolio personal-finance-app auction-house])
    expect(Project.find_by!(slug: "auction-house")).to have_attributes(status: "done",
                                                                       technologies: %w[rails rspec bootstrap])
    expect(Project.find_by!(slug: "auction-house").links.map(&:url))
      .to eq([ "https://github.com/BrunoSGuima/auction-house" ])
  end

  it "gives the Personal Finance App (a private repository) no links" do
    load_seeds

    project = Project.find_by!(slug: "personal-finance-app")
    expect(project).to have_attributes(status: "in-progress", technologies: %w[flutter dart])
    expect(project.links).to be_empty
  end

  it "only writes valid records" do
    load_seeds

    expect(Project.all).to all(be_valid)
    expect(ProjectLink.all).to all(be_valid)
  end

  it "is idempotent: running it again duplicates neither projects nor links" do
    load_seeds
    snapshot = -> { [ Project.count, ProjectLink.count, Project.pluck(:slug, :name), ProjectLink.pluck(:url, :position) ] }
    first = snapshot.call

    load_seeds
    load_seeds

    expect(snapshot.call).to eq(first)
  end

  it "restores a project's links to the seeded list" do
    load_seeds
    project = Project.find_by!(slug: "developer-portfolio")
    create(:project_link, project:, url: "https://example.com/extra")
    project.links.first.update!(position: 9)

    load_seeds

    expect(project.links.reload.map { |link| [ link.url, link.position ] })
      .to eq([ [ "https://github.com/BrunoSGuima/developer-portfolio", 0 ] ])
  end

  it "leaves no partial changes when a step fails" do
    load_seeds
    project = Project.find_by!(slug: "developer-portfolio")
    project.update_columns(status: "planned")
    links_before = project.links.pluck(:id)
    allow_any_instance_of(ProjectLink).to receive(:save!).and_raise(ActiveRecord::RecordInvalid)

    expect { load_seeds }.to raise_error(ActiveRecord::RecordInvalid)

    expect(project.reload.status).to eq("planned")
    expect(project.links.pluck(:id)).to eq(links_before)
  end
end
