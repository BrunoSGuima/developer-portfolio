Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Public endpoints live under /api/v1 (ADR-0012) and are served same-origin with the shell
  # through a proxy, so there is no CORS configuration (ADR-0011). None exist yet.
end
