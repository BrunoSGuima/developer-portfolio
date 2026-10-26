# Read-only projects (Step 2.4). Only published projects are ever loaded; an unpublished project
# answers exactly like an unknown one, so its existence never leaks.
module Api
  module V1
    class ProjectsController < Api::BaseController
      def index
        projects = Project.published.ordered.includes(:links)

        render json: { data: projects.map { |project| ProjectSerializer.call(project) } }
      end

      def show
        project = find_published_project(params[:slug])
        return render_error(:not_found, "not_found", "Project not found") unless project

        render json: { data: ProjectSerializer.call(project) }
      end

      private

      # Only the canonical slug matches: the model normalises slugs (so find_by alone would also
      # match "Portfolio"), but a URL has exactly one spelling.
      def find_published_project(slug)
        return unless slug.match?(Project::SLUG_FORMAT)

        Project.published.includes(:links).find_by(slug:)
      end
    end
  end
end
