import { swagger as acquisitions } from "../modules/acquisitions/swagger.js";
import { swagger as admins } from "../modules/admins/swagger.js";
import { swagger as adminSettings } from "../modules/adminSettings/swagger.js";
import { swagger as appConfig } from "../modules/appConfig/swagger.js";
import { swagger as auditLogs } from "../modules/auditLogs/swagger.js";
import { swagger as auth } from "../modules/auth/swagger.js";
import { swagger as buyEnquiries } from "../modules/buyEnquiries/swagger.js";
import { swagger as callbacks } from "../modules/callbacks/swagger.js";
import { swagger as chatThreads } from "../modules/chatThreads/swagger.js";
import { swagger as communicationLogs } from "../modules/communicationLogs/swagger.js";
import { swagger as content } from "../modules/content/swagger.js";
import { swagger as documents } from "../modules/documents/swagger.js";
import { swagger as editLocks } from "../modules/editLocks/swagger.js";
import { swagger as interiorLeads } from "../modules/interiorLeads/swagger.js";
import { swagger as notifications } from "../modules/notifications/swagger.js";
import { swagger as payments } from "../modules/payments/swagger.js";
import { swagger as properties } from "../modules/properties/swagger.js";
import { swagger as reports } from "../modules/reports/swagger.js";
import { swagger as salesDeals } from "../modules/salesDeals/swagger.js";
import { swagger as sellRequests } from "../modules/sellRequests/swagger.js";
import { swagger as supportTickets } from "../modules/supportTickets/swagger.js";
import { swagger as users } from "../modules/users/swagger.js";
import { swagger as visits } from "../modules/visits/swagger.js";
import { components } from "./components.js";

const moduleSpecs = [
  appConfig,
  content,
  adminSettings,
  editLocks,
  auth,
  users,
  admins,
  communicationLogs,
  properties,
  buyEnquiries,
  sellRequests,
  acquisitions,
  salesDeals,
  visits,
  callbacks,
  chatThreads,
  interiorLeads,
  supportTickets,
  payments,
  documents,
  notifications,
  auditLogs,
  reports
];

const successExample = { data: {}, meta: { requestId: "req_example" } };
const errorExample = {
  error: { code: "ERROR", message: "Request failed", details: [] },
  meta: { requestId: "req_example" }
};

const enrichResponse = (code, response) => {
  if (response.$ref) return response;
  const status = Number(code);
  if (status >= 200 && status < 300) {
    return {
      description: response.description,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/SuccessEnvelope" },
          examples: { default: { value: successExample } }
        }
      }
    };
  }
  if (status === 400) return { $ref: "#/components/responses/ValidationError" };
  if (status === 401) return { $ref: "#/components/responses/Unauthorized" };
  if (status === 403) return { $ref: "#/components/responses/Forbidden" };
  if (status >= 400) {
    return {
      description: response.description,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorEnvelope" },
          examples: { default: { value: errorExample } }
        }
      }
    };
  }
  return response;
};

const enrichOperation = (operation) => {
  const enriched = { ...operation };
  enriched.responses = {};
  for (const [code, response] of Object.entries(operation.responses ?? {})) {
    enriched.responses[code] = enrichResponse(code, response);
  }
  if (operation.requestBody && !enriched.responses["400"]) {
    enriched.responses["400"] = { $ref: "#/components/responses/ValidationError" };
  }
  if (operation.security?.length && !enriched.responses["401"]) {
    enriched.responses["401"] = { $ref: "#/components/responses/Unauthorized" };
  }
  if (operation.security?.length && !enriched.responses["403"]) {
    enriched.responses["403"] = { $ref: "#/components/responses/Forbidden" };
  }
  return enriched;
};

const mergePaths = () => {
  const paths = {};
  for (const spec of moduleSpecs) {
    for (const [path, methods] of Object.entries(spec)) {
      paths[path] ??= {};
      for (const [method, operation] of Object.entries(methods)) {
        paths[path][method] = enrichOperation(operation);
      }
    }
  }
  return paths;
};

export const buildOpenapiSpec = () => ({
  openapi: "3.1.0",
  info: { title: "BuiltGlory Backend API", version: "1.0.0" },
  servers: [{ url: "/api/v1" }],
  paths: mergePaths(),
  components
});
