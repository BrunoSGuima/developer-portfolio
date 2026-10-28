# syntax=docker/dockerfile:1
#
# The production image for Stage A (ADR-0015, Phase 4 Step 4.2): one service that serves the
# React shell's full-stack build and the Rails API from one origin. PostgreSQL is external
# (DATABASE_URL). Portable: nothing here is specific to a hosting provider.
#
#   docker build -t portfolio .
#   docker run --rm -e DATABASE_URL=… -e SECRET_KEY_BASE=… portfolio bin/release   # once per deploy
#   docker run -p 3000:3000 -e DATABASE_URL=… -e SECRET_KEY_BASE=… portfolio       # the web service
#
# No secrets are baked in: DATABASE_URL and SECRET_KEY_BASE come from the environment at run time.
# The web command never migrates; bin/release does, as a separate one-off command.
#
# Base images are pinned by tag and digest (like the CI actions' commit SHAs); update both together.

# ---- 1. The shell: npm workspaces, built in full-stack mode ----
FROM node:22.23.3-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9 AS shell

WORKDIR /build
# The workspace manifests first, so dependencies are cached until the lockfile changes.
COPY package.json package-lock.json .nvmrc ./
COPY apps/shell/package.json apps/shell/package.json
COPY e2e/package.json e2e/package.json
RUN npm ci --workspace apps/shell --include-workspace-root --ignore-scripts --no-audit --no-fund

COPY apps/shell apps/shell
RUN npm run build:fullstack -w apps/shell \
  && if find apps/shell/dist -name '*.map' | grep -q .; then echo "Source maps in the build" >&2; exit 1; fi

# ---- 2. The gems (production groups only), with the build tools they need ----
FROM ruby:4.0.9-slim@sha256:32fdd19c0a001077d1711f1afa6d8a0ac9d497c4eac20e47ae7e1c7f7a8c49df AS gems

ENV BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test:e2e

RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y build-essential libpq-dev libyaml-dev pkg-config \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /rails
COPY services/api/Gemfile services/api/Gemfile.lock services/api/.ruby-version ./
RUN bundle install \
  && rm -rf "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

COPY services/api ./
RUN bundle exec bootsnap precompile --gemfile app/ lib/

# ---- 3. The runtime: Ruby, the PostgreSQL client library, the app and the shell's build ----
FROM ruby:4.0.9-slim@sha256:32fdd19c0a001077d1711f1afa6d8a0ac9d497c4eac20e47ae7e1c7f7a8c49df AS runtime

RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y libpq5 libyaml-0-2 \
  && rm -rf /var/lib/apt/lists/*

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test:e2e \
    SHELL_ROOT=/rails/shell \
    PORT=3000

# A non-root user; it may write only tmp/ and log/.
RUN groupadd --system --gid 1000 rails \
  && useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash

WORKDIR /rails
COPY --from=gems /usr/local/bundle /usr/local/bundle
COPY --from=gems /rails /rails
COPY --from=shell /build/apps/shell/dist /rails/shell
RUN mkdir -p tmp log \
  && chown -R rails:rails tmp log

USER 1000:1000
EXPOSE 3000

# The web service only: Puma (config/puma.rb, PORT). Never migrates; see bin/release.
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
