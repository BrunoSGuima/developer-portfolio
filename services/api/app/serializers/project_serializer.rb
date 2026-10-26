# The public JSON of a project (docs/openapi.yaml, Project). An explicit allowlist: columns added
# to the model never reach the API unless listed here. Internal fields (id, position, published,
# timestamps) are left out; the order of the list conveys the position.
module ProjectSerializer
  def self.call(project)
    {
      slug: project.slug,
      name: project.name,
      description: project.description,
      status: project.status,
      technologies: project.technologies,
      links: project.links.map { |link| { label: link.label, url: link.url } }
    }
  end
end
