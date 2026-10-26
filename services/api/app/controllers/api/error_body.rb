# The error envelope of ADR-0012, shared by controllers and the Rack middleware:
#   { "error": { "code": "…", "message": "…", "details": { … } } }
module Api
  module ErrorBody
    def self.build(code, message, details = {})
      { error: { code:, message:, details: } }
    end
  end
end
