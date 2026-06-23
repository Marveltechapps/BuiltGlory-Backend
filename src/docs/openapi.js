import { swagger as authSwagger } from "../modules/auth/swagger.js";
import { swagger as usersSwagger } from "../modules/users/swagger.js";
import { swagger as adminsSwagger } from "../modules/admins/swagger.js";
import { swagger as propertiesSwagger } from "../modules/properties/swagger.js";
import { swagger as buyEnquiriesSwagger } from "../modules/buyEnquiries/swagger.js";
import { swagger as sellRequestsSwagger } from "../modules/sellRequests/swagger.js";
import { swagger as acquisitionsSwagger } from "../modules/acquisitions/swagger.js";
import { swagger as salesDealsSwagger } from "../modules/salesDeals/swagger.js";
import { swagger as visitsSwagger } from "../modules/visits/swagger.js";
import { swagger as callbacksSwagger } from "../modules/callbacks/swagger.js";
import { swagger as chatThreadsSwagger } from "../modules/chatThreads/swagger.js";
import { swagger as interiorLeadsSwagger } from "../modules/interiorLeads/swagger.js";
import { swagger as supportTicketsSwagger } from "../modules/supportTickets/swagger.js";
import { swagger as paymentsSwagger } from "../modules/payments/swagger.js";
import { swagger as documentsSwagger } from "../modules/documents/swagger.js";
import { swagger as notificationsSwagger } from "../modules/notifications/swagger.js";
import { swagger as auditLogsSwagger } from "../modules/auditLogs/swagger.js";
import { swagger as reportsSwagger } from "../modules/reports/swagger.js";
const paths = Object.assign({}, authSwagger, usersSwagger, adminsSwagger, propertiesSwagger, buyEnquiriesSwagger, sellRequestsSwagger, acquisitionsSwagger, salesDealsSwagger, visitsSwagger, callbacksSwagger, chatThreadsSwagger, interiorLeadsSwagger, supportTicketsSwagger, paymentsSwagger, documentsSwagger, notificationsSwagger, auditLogsSwagger, reportsSwagger);
const publicPaths = ["/auth/customer/otp/send", "/auth/customer/otp/verify", "/auth/admin/login", "/auth/refresh", "/payments/webhook"];
const writeMethods = ["post", "put", "patch"];
const permissionFor = (path) => {
  if (!path.startsWith("/admin")) return undefined;
  if (path.includes("properties")) return "properties.write";
  if (path.includes("users")) return "users.write";
  if (path.includes("acquisitions")) return "acquisitions.write";
  if (path.includes("sales")) return "sales.write";
  if (path.includes("reports")) return "reports.read";
  if (path.includes("audit")) return "audit.read";
  return "admin";
};
const enrichOperation = (path, method, operation) => {
  if (!operation || typeof operation !== "object") return operation;
  const secured = !publicPaths.includes(path);
  if (secured && !operation.security) operation.security = [{ bearerAuth: [] }];
  const permission = permissionFor(path);
  if (permission && !operation["x-permission"]) operation["x-permission"] = permission;
  if (writeMethods.includes(method) && !operation.requestBody) {
    operation.requestBody = { required: method === "post", content: { "application/json": { schema: { type: "object" }, examples: { default: { value: {} } } } } };
  }
  operation.responses = operation.responses || {};
  for (const status of Object.keys(operation.responses)) {
    const response = operation.responses[status];
    if (!response.content && status !== "204") response.content = { "application/json": { schema: { $ref: status.startsWith("2") ? "#/components/schemas/SuccessEnvelope" : "#/components/schemas/ErrorEnvelope" }, examples: { default: { value: status.startsWith("2") ? { data: {}, meta: { requestId: "req_example" } } : { error: { code: "ERROR", message: "Request failed", details: [] }, meta: { requestId: "req_example" } } } } } };
  }
  if (!operation.responses["400"]) operation.responses["400"] = { $ref: "#/components/responses/ValidationError" };
  if (secured && !operation.responses["401"]) operation.responses["401"] = { $ref: "#/components/responses/Unauthorized" };
  if (path.startsWith("/admin") && !operation.responses["403"]) operation.responses["403"] = { $ref: "#/components/responses/Forbidden" };
  return operation;
};
for (const [path, item] of Object.entries(paths)) {
  for (const method of Object.keys(item)) enrichOperation(path, method, item[method]);
}
export const openapi = {
  openapi: "3.1.0",
  info: { title: "BuiltGlory Backend API", version: "1.0.0" },
  servers: [{ url: "/api/v1" }],
  paths,
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Meta: { type: "object", properties: { requestId: { type: "string" }, page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, totalPages: { type: "integer" } } },
      ErrorDetail: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } },
      ErrorEnvelope: { type: "object", required: ["error", "meta"], properties: { error: { type: "object", required: ["code", "message", "details"], properties: { code: { type: "string" }, message: { type: "string" }, details: { type: "array", items: { $ref: "#/components/schemas/ErrorDetail" } } } }, meta: { $ref: "#/components/schemas/Meta" } } },
      SuccessEnvelope: { type: "object", required: ["data", "meta"], properties: { data: {}, meta: { $ref: "#/components/schemas/Meta" } } },
      Reference: { type: "object", properties: { _id: { type: "string" }, referenceId: { type: "string" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
      AuthTokens: { type: "object", properties: { accessToken: { type: "string" }, refreshToken: { type: "string" }, expiresInSeconds: { type: "integer" } } },
      Property: { allOf: [{ $ref: "#/components/schemas/Reference" }, { type: "object", properties: { title: { type: "string" }, type: { type: "string" }, status: { type: "string" }, price: { type: "number" }, address: { type: "object" }, media: { type: "object" } } }] },
      User: { allOf: [{ $ref: "#/components/schemas/Reference" }, { type: "object", properties: { phone: { type: "string" }, role: { type: "string" }, userType: { type: "string" }, kycStatus: { type: "string" }, femaCompliance: { type: "object" } } }] },
      Payment: { allOf: [{ $ref: "#/components/schemas/Reference" }, { type: "object", properties: { amount: { type: "number" }, currency: { type: "string" }, status: { type: "string" }, providerEventId: { type: "string" } } }] },
      Notification: { allOf: [{ $ref: "#/components/schemas/Reference" }, { type: "object", properties: { event: { type: "string" }, channel: { type: "string" }, status: { type: "string" }, attempts: { type: "integer" }, maxAttempts: { type: "integer" } } }] },
      ReportSummary: { type: "object", properties: { funnel: { type: "object" }, stageAging: { type: "object" }, revenueByType: { type: "array", items: { type: "object" } }, buyerReport: { type: "object" }, sellerReport: { type: "object" } } }
    },
    responses: {
      Unauthorized: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
      Forbidden: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
      ValidationError: { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } }
    }
  }
};