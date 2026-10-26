require "rails_helper"

RSpec.describe ProjectSerializer do
  it "exposes only the public fields" do
    data = described_class.call(create(:project, :with_links))

    expect(data.keys).to eq(%i[slug name description status technologies links])
    expect(data[:links].map(&:keys)).to all(eq(%i[label url]))
  end
end
