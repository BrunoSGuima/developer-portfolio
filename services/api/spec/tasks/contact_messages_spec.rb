require "rails_helper"
require "rake"

RSpec.describe "contact_messages rake tasks" do
  before(:all) do
    Rails.application.load_tasks unless Rake::Task.task_defined?("contact_messages:list")
  end

  # Runs a task once with the given environment variables and returns what it printed (captured,
  # so stored messages never appear in the test or CI output).
  def run(task, env = {})
    original = env.keys.index_with { |key| ENV[key] }
    env.each { |key, value| ENV[key] = value }
    Rake::Task[task].reenable
    capture_output { Rake::Task[task].invoke }
  ensure
    original&.each { |key, value| ENV[key] = value }
  end

  def capture_output
    previous = $stdout
    $stdout = StringIO.new
    yield
    $stdout.string
  ensure
    $stdout = previous
  end

  describe "contact_messages:list" do
    it "warns that it shows personal data and says when there are no messages" do
      output = run("contact_messages:list")

      expect(output).to include("personal data", "No messages.")
    end

    it "shows messages newest first" do
      create(:contact_message, name: "Older", created_at: 2.days.ago)
      create(:contact_message, name: "Newer", created_at: 1.day.ago)

      output = run("contact_messages:list")

      expect(output.index("Newer")).to be < output.index("Older")
    end

    it "shows at most 20 by default, LIMIT changes it" do
      create_list(:contact_message, 21)

      expect(run("contact_messages:list").scan(/<ada\d+@example\.com>/).size).to eq(20)
      expect(run("contact_messages:list", "LIMIT" => "3").scan(/<ada\d+@example\.com>/).size).to eq(3)
    end

    {
      { "LIMIT" => "abc" } => "LIMIT must be a whole number from 1 to 500.",
      { "LIMIT" => "0" } => "LIMIT must be a whole number from 1 to 500.",
      { "LIMIT" => "501" } => "LIMIT must be a whole number from 1 to 500.",
      { "SINCE" => "yesterday" } => "SINCE must be a date like 2026-10-01."
    }.each do |env, message|
      it "stops with a clear message for #{env.to_a.flatten.join('=')}, without a backtrace" do
        create(:contact_message)
        stderr = StringIO.new
        previous = $stderr
        $stderr = stderr

        expect { run("contact_messages:list", env) }.to raise_error(SystemExit) { |exit| expect(exit.status).to eq(1) }
        expect(stderr.string).to eq("#{message}\n")
      ensure
        $stderr = previous
      end
    end

    it "filters with SINCE" do
      create(:contact_message, name: "Before", created_at: Time.zone.parse("2026-01-01 12:00"))
      create(:contact_message, name: "After", created_at: Time.zone.parse("2026-03-01 12:00"))

      output = run("contact_messages:list", "SINCE" => "2026-02-01")

      expect(output).to include("After")
      expect(output).not_to include("Before")
    end
  end

  describe "contact_messages:purge" do
    let!(:expired) { create(:contact_message, created_at: 12.months.ago - 1.day) }
    let!(:kept) { create(:contact_message, created_at: 12.months.ago + 1.day) }

    it "deletes only messages older than 12 months" do
      output = run("contact_messages:purge")

      expect(output).to include("Deleted 1 contact message(s)")
      expect(ContactMessage.all).to eq([ kept ])
    end

    it "only counts with DRY_RUN" do
      output = run("contact_messages:purge", "DRY_RUN" => "1")

      expect(output).to include("1 contact message(s) older than 12 months would be deleted")
      expect(ContactMessage.count).to eq(2)
    end
  end
end
