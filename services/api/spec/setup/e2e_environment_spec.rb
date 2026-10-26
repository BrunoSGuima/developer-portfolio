require "rails_helper"
require "rake"
require "open3"

# The e2e environment exists only for the Playwright suite (bin/e2e-server). These guards keep
# its database and its file-based rate-limit store away from development, test and production.
RSpec.describe "The e2e environment" do
  let(:databases) do
    %w[development test e2e].index_with do |env|
      ActiveRecord::Base.configurations.configs_for(env_name: env).first.database
    end
  end

  it "has its own database, distinct from development and test" do
    expect(databases["e2e"]).to eq("portfolio_api_e2e")
    expect(databases.values.uniq.size).to eq(3)
  end

  it "is the only environment with a file-based rate-limit store, at a fixed path" do
    environments = Rails.root.glob("config/environments/*.rb").to_h { |file| [ file.basename(".rb").to_s, file.read ] }

    expect(environments.keys).to include("e2e", "development", "test", "production")
    expect(environments.select { |_, source| source.include?("FileStore") }.keys).to eq([ "e2e" ])
    expect(environments["e2e"]).to include('FileStore.new(Rails.root.join("tmp/e2e/rate-limits"))')
    expect(Rails.root.join("config/application.rb").read).to include("ActiveSupport::Cache::MemoryStore.new")
  end

  it "keeps the in-memory store in this (test) environment" do
    expect(Rails.configuration.x.rate_limit_store).to be_a(ActiveSupport::Cache::MemoryStore)
  end

  describe "bin/e2e-server" do
    it "refuses any other environment before touching a database" do
      output, status = Open3.capture2e({ "RAILS_ENV" => "development" }, Rails.root.join("bin/e2e-server").to_s)

      expect(status.exitstatus).to eq(1)
      expect(output).to include("only runs the e2e environment")
    end
  end

  describe "rake e2e:reset" do
    before(:all) { Rails.application.load_tasks unless Rake::Task.task_defined?("e2e:reset") }

    def reset
      Rake::Task["e2e:reset"].reenable
      stderr = StringIO.new
      previous = $stderr
      $stderr = stderr
      Rake::Task["e2e:reset"].invoke
    rescue SystemExit => exit
      [ exit.status, stderr.string ]
    ensure
      $stderr = previous
    end

    it "refuses to run outside the e2e environment, deleting nothing" do
      create(:contact_message)

      expect(reset).to eq([ 1, "e2e:reset only runs with RAILS_ENV=e2e (got test).\n" ])
      expect(ContactMessage.count).to eq(1)
    end

    it "refuses to run when the connected database isn't the e2e one, deleting nothing" do
      create(:contact_message)
      allow(Rails).to receive(:env).and_return(ActiveSupport::EnvironmentInquirer.new("e2e"))

      expect(reset).to eq([ 1, "e2e:reset only runs against portfolio_api_e2e (connected to portfolio_api_test).\n" ])
      expect(ContactMessage.count).to eq(1)
    end
  end
end
