require "rails_helper"

RSpec.describe "Database" do
  let(:connection) { ActiveRecord::Base.connection }

  it "is PostgreSQL 18" do
    expect(connection.adapter_name).to eq("PostgreSQL")
    expect(connection.database_version / 10_000).to eq(18)
  end

  it "uses the test database, never the development one" do
    expect(connection.current_database).to eq("portfolio_api_test")
  end

  it "runs every example inside a transaction that is rolled back" do
    expect(connection.transaction_open?).to be(true)
  end

  # The two examples below run in random order; each must start without the other's row.
  describe "isolation between examples" do
    before do
      connection.create_table(:isolation_probes, temporary: true, if_not_exists: true) do |t|
        t.string :label
      end
    end

    2.times do |index|
      it "starts empty and keeps its own row only (#{index + 1})" do
        expect(connection.select_value("SELECT count(*) FROM isolation_probes")).to eq(0)

        connection.insert("INSERT INTO isolation_probes (label) VALUES ('example #{index + 1}')")

        expect(connection.select_value("SELECT count(*) FROM isolation_probes")).to eq(1)
      end
    end
  end
end
