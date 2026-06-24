export const swagger = {
  "/auth/customer/otp/send": {
    post: {
      tags: ["Auth"],
      summary: "Send customer OTP",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["phone"], properties: { countryCode: { type: "string", example: "+91" }, phone: { type: "string", pattern: "^\\d{10}$", example: "9876543210" }, deviceId: { type: "string", example: "device_123" } } } } }
      },
      responses: { 200: { description: "OTP request issued" }, 429: { description: "Rate limited" } }
    }
  },
  "/auth/customer/otp/verify": {
    post: {
      tags: ["Auth"],
      summary: "Verify customer 6-digit OTP",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["phone", "otp"], properties: { requestId: { type: "string", example: "otp_req_00000000-0000-0000-0000-000000000000" }, countryCode: { type: "string", example: "+91" }, phone: { type: "string", pattern: "^\\d{10}$", example: "9876543210" }, otp: { type: "string", pattern: "^\\d{6}$", example: "123456" } } } } }
      },
      responses: { 200: { description: "Customer session" } }
    }
  },
  "/auth/email/otp/send": {
    post: {
      tags: ["Auth"],
      summary: "Send email verification OTP",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email", example: "customer@example.com" } } } } }
      },
      responses: {
        200: { description: "Email OTP sent" },
        409: { description: "Resend cooldown active" },
        429: { description: "Rate limited" },
        502: { description: "Email delivery failed" }
      }
    }
  },
  "/auth/email/otp/resend": {
    post: {
      tags: ["Auth"],
      summary: "Resend email verification OTP",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email", example: "customer@example.com" } } } } }
      },
      responses: {
        200: { description: "Email OTP resent" },
        409: { description: "Resend cooldown active" },
        429: { description: "Rate limited" },
        502: { description: "Email delivery failed" }
      }
    }
  },
  "/auth/email/otp/verify": {
    post: {
      tags: ["Auth"],
      summary: "Verify email OTP and issue JWT tokens",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "otp"],
              properties: {
                email: { type: "string", format: "email", example: "customer@example.com" },
                otp: { type: "string", pattern: "^\\d{6}$", example: "123456" },
                requestId: { type: "string", example: "email_otp_00000000-0000-0000-0000-000000000000" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Customer session" },
        401: { description: "Invalid or expired OTP" },
        409: { description: "OTP verification locked" },
        429: { description: "Rate limited" }
      }
    }
  },
  "/auth/admin/login": { post: { tags: ["Auth"], summary: "Admin login", responses: { 200: { description: "Admin session" } } } },
  "/auth/refresh": { post: { tags: ["Auth"], summary: "Refresh access token", responses: { 200: { description: "New access token" } } } },
  "/auth/logout": { post: { tags: ["Auth"], summary: "Logout and revoke refresh token", responses: { 200: { description: "Revoked" } } } }
};