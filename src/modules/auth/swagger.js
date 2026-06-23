export const swagger = {
  "/auth/customer/otp/send": { post: { tags: ["Auth"], summary: "Send customer OTP", responses: { 200: { description: "OTP request issued" }, 429: { description: "Rate limited" } } } },
  "/auth/customer/otp/verify": { post: { tags: ["Auth"], summary: "Verify customer OTP", responses: { 200: { description: "Customer session" } } } },
  "/auth/admin/login": { post: { tags: ["Auth"], summary: "Admin login", responses: { 200: { description: "Admin session" } } } },
  "/auth/refresh": { post: { tags: ["Auth"], summary: "Refresh access token", responses: { 200: { description: "New access token" } } } },
  "/auth/logout": { post: { tags: ["Auth"], summary: "Logout and revoke refresh token", responses: { 200: { description: "Revoked" } } } }
};