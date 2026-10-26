Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Public, read-only endpoints (ADR-0012), served same-origin with the shell through a proxy, so
  # there is no CORS configuration (ADR-0011). Contract: docs/openapi.yaml.
  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      # No format suffix (format: false): a dot is never split off as a format, so
      # "valid-slug.json" or "a.b" can't resolve to the project "valid-slug" or "a". The whole
      # segment (dots included) is the slug, and the controller only accepts canonical slugs: any
      # other segment is a "Project not found" 404 for GET, and a 405 for other methods.
      scope format: false, constraints: { slug: %r{[^/]+} } do
        resources :projects, only: %i[index show], param: :slug

        # Other methods on existing resources: 405 with an Allow header (GET also answers HEAD).
        # (as: nil: these routes get no path helpers, so e.g. api_v1_path can't point at a 405.)
        match "projects", to: "/api/base#method_not_allowed", via: :all, allow: "GET, HEAD", as: nil
        match "projects/:slug", to: "/api/base#method_not_allowed", via: :all, allow: "GET, HEAD", as: nil

        # Contact messages can only be created: nothing can read them over HTTP (ADR-0013).
        resources :contact_messages, only: :create
        match "contact_messages", to: "/api/base#method_not_allowed", via: :all, allow: "POST", as: nil
      end
    end

    # Any other path under /api, /api itself included: the JSON 404 of ADR-0012 (not Rails'
    # routing error).
    match "(*unmatched)", to: "base#route_not_found", via: :all, as: nil
  end
end
