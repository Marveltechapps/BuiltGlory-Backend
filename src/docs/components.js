export const components = {
  securitySchemes: {
    bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
  },
  schemas: {
    Meta: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" }
      }
    },
    ErrorDetail: {
      type: "object",
      properties: { field: { type: "string" }, message: { type: "string" } }
    },
    ErrorEnvelope: {
      type: "object",
      required: ["error", "meta"],
      properties: {
        error: {
          type: "object",
          required: ["code", "message", "details"],
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            details: { type: "array", items: { $ref: "#/components/schemas/ErrorDetail" } }
          }
        },
        meta: { $ref: "#/components/schemas/Meta" }
      }
    },
    SuccessEnvelope: {
      type: "object",
      required: ["data", "meta"],
      properties: { data: {}, meta: { $ref: "#/components/schemas/Meta" } }
    },
    Reference: {
      type: "object",
      properties: {
        _id: { type: "string" },
        referenceId: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" }
      }
    },
    AuthTokens: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        refreshToken: { type: "string" },
        expiresInSeconds: { type: "integer" }
      }
    },
    Property: {
      allOf: [
        { $ref: "#/components/schemas/Reference" },
        {
          type: "object",
          properties: {
            title: { type: "string" },
            type: { type: "string" },
            status: { type: "string" },
            price: { type: "number" },
            address: { type: "object" },
            media: { type: "object" }
          }
        }
      ]
    },
    User: {
      allOf: [
        { $ref: "#/components/schemas/Reference" },
        {
          type: "object",
          properties: {
            phone: { type: "string" },
            role: { type: "string" },
            userType: { type: "string" },
            kycStatus: { type: "string" },
            femaCompliance: { type: "object" }
          }
        }
      ]
    },
    Payment: {
      allOf: [
        { $ref: "#/components/schemas/Reference" },
        {
          type: "object",
          properties: {
            amount: { type: "number" },
            currency: { type: "string" },
            status: { type: "string" },
            providerEventId: { type: "string" }
          }
        }
      ]
    },
    Notification: {
      allOf: [
        { $ref: "#/components/schemas/Reference" },
        {
          type: "object",
          properties: {
            event: { type: "string" },
            channel: { type: "string" },
            status: { type: "string" },
            attempts: { type: "integer" },
            maxAttempts: { type: "integer" }
          }
        }
      ]
    },
    ReportSummary: {
      type: "object",
      properties: {
        funnel: { type: "object" },
        stageAging: { type: "object" },
        revenueByType: { type: "array", items: { type: "object" } },
        buyerReport: { type: "object" },
        sellerReport: { type: "object" }
      }
    }
  },
  responses: {
    Unauthorized: {
      description: "Unauthorized",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } }
    },
    Forbidden: {
      description: "Forbidden",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } }
    },
    ValidationError: {
      description: "Validation failed",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } }
    }
  }
};
