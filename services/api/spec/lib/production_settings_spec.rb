require "rails_helper"

RSpec.describe ProductionSettings do
  describe ".allowed_hosts" do
    it "accepts exact hostnames (normalised) and IPv4 literals" do
      expect(described_class.allowed_hosts(" Portfolio-XYZ.onrender.com , example.dev,www.example.dev,127.0.0.1"))
        .to eq(%w[portfolio-xyz.onrender.com example.dev www.example.dev 127.0.0.1])
    end

    it "is required: missing or blank fails" do
      [ nil, "", "  " ].each do |value|
        expect { described_class.allowed_hosts(value) }.to raise_error(ProductionSettings::Error, /required/)
      end
    end

    it "rejects wildcards, leading dots, ports, schemes, paths and empty entries" do
      [ ".onrender.com", "*.example.dev", "example.dev:443", "https://example.dev", "example.dev/x",
        "example.dev,", "a..b", "-bad.dev", "exa mple.dev", "999.1.1.1" ].each do |value|
        expect { described_class.allowed_hosts(value) }.to raise_error(ProductionSettings::Error, /invalid entry/), value
      end
    end
  end

  describe ".trusted_proxies" do
    it "is optional: unset or blank keeps Rails' defaults (nil)" do
      expect(described_class.trusted_proxies(nil)).to be_nil
      expect(described_class.trusted_proxies(" ")).to be_nil
    end

    it "parses IPs and CIDR ranges (IPv4 and IPv6)" do
      proxies = described_class.trusted_proxies("10.0.0.0/8, 192.0.2.7,fd00::/8")

      expect(proxies).to all(be_a(IPAddr))
      expect(proxies.map { |proxy| proxy.include?(IPAddr.new("10.1.2.3")) }).to eq([ true, false, false ])
    end

    it "rejects anything that isn't an IP or a range" do
      [ "10.0.0.0/33", "proxy.example", "10.0.0.1,", "*" ].each do |value|
        expect { described_class.trusted_proxies(value) }.to raise_error(ProductionSettings::Error, /invalid entry/), value
      end
    end
  end

  it "sets a short HSTS lifetime for the first deployment (one day)" do
    expect(ProductionSettings::HSTS_MAX_AGE).to eq(86_400)
  end
end
