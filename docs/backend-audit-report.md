# Backend Audit Report

## Scope
Audited the generated backend against `README.md`, `architecture-design.md`, `api-contract.md`, `database-schema.md`, and `business-rules.md`.

## Overall Result
Status: PARTIALLY IMPLEMENTED

The backend has the expected Express/Mongoose module skeleton, all documented API paths are present, all main collections have Mongoose schemas, and core middleware exists. The main gaps are strict endpoint-specific validation, exact response shaping, deeper Swagger schemas, transaction-backed multi-document workflows, complete notification dispatch jobs, and fuller API/business-rule tests.

## Modules
Implemented:
- `auth`, `users`, `admins`, `properties`, `buyEnquiries`, `sellRequests`, `acquisitions`, `salesDeals`, `visits`, `callbacks`, `chatThreads`, `interiorLeads`, `supportTickets`, `payments`, `documents`, `notifications`, `auditLogs`

Partially implemented:
- `reports`: implemented inline in `src/routes.js`, but no dedicated `src/modules/reports` module with model/schema/repository/service/controller/route/validator/permissions/swagger.
- `jobs`: folder exists in target architecture but no recurring SLA, notification retry, report export, metrics backfill, or scan processing jobs were found.

Missing:
- Dedicated `requestLogger` middleware file from architecture design.
- Dedicated `permissions` middleware file; RBAC exists in `src/middleware/auth.js`.

## Collections
Implemented:
- `users`, `admins`, `properties`, `buyEnquiries`, `sellRequests`, `acquisitions`, `salesDeals`, `visits`, `callbacks`, `chatThreads`, `interiorLeads`, `supportTickets`, `payments`, `documents`, `auditLogs`

Additional implemented:
- `notifications`, required by the task and business rules.

Missing:
- None from `database-schema.md`.

Partial:
- Auth sessions and OTPs are Redis-backed, not modeled as Mongo collections. This is acceptable architecturally but not represented in database audit coverage.

## APIs
Implemented:
- All endpoints listed in `api-contract.md` exist under `/api/v1`.
- `/openapi.json`, `/api-docs`, `/health`, and `/ready` exist.

Partial:
- Request validation is mostly generic in module validators and does not exactly enforce documented payloads.
- Response payloads are mostly raw Mongoose documents, not exact flattened DTOs from `api-contract.md`.
- Pagination exists generically, but endpoint-specific filters/sorting are incomplete.
- Swagger path coverage exists, but request/response schemas are shallow.

Missing:
- No documented endpoint path is fully missing.

## Controllers, Services, Repositories
Implemented:
- Each main module has controller, repository, service, route, validator, permissions, and swagger files.
- Shared factories provide list/get/create/update/transition/remove behavior.

Partial:
- Many controllers rely on generic factory behavior and do not shape endpoint-specific responses.
- Many validators accept unknown payload fields.
- Some domain writes are implemented without MongoDB transactions.

## Middleware
Implemented:
- Auth/JWT middleware.
- Permission checks.
- Joi validation middleware.
- Error handler and not found handler.
- Rate limiting.
- Request context.
- Helmet, CORS, compression, cookie parser, body size limits.

Partial:
- No explicit Mongo operator sanitization middleware.
- CORS defaults to open origin when `CORS_ORIGINS` is empty.
- No dedicated request logger middleware.

## Swagger Definitions
Implemented:
- Every module has a `swagger.js`.
- `src/docs/openapi.js` combines all Swagger path fragments.

Partial:
- Most Swagger entries only include path, summary, and response descriptions.
- Missing detailed request bodies, response schemas, auth requirements, parameters, pagination metadata, and error schemas.

## Permissions
Implemented:
- Permission constants and role permission map in `src/constants/permissions.js`.
- Admin routes use `authenticate("admin")` and `requirePermission(...)`.

Partial:
- Financial and closure operations use the broad `sales.write` permission, not a separate elevated permission.
- `properties.publish` exists but status/publish routes use `properties.write`.
- Exact final role-permission matrix remains an open source-document decision.

## Upload Flows
Implemented:
- Upload intent route.
- Multipart document upload route.
- Property media upload route.
- S3 signed URL and S3 upload helpers.
- File type and size validation.
- Document metadata, private defaults, and scan status field.

Partial:
- No real malware scanning job/provider.
- Property media uses `s3://` storage URL rather than CDN/public URL.
- No document retention/lifecycle cleanup.
- KYC/legal/payment upload ownership flows are generic, not purpose-specific endpoints.

## Payment Flows
Implemented:
- Token payment order creation.
- Razorpay order call boundary.
- Webhook raw body handling and signature verification.
- Idempotency key lookup.
- Payment status transitions and token reserve side effect.

Partial:
- No Mongo transaction for payment + deal + property update.
- Webhook payload support is Razorpay-shaped and depends on final provider.
- Payment status audit is indirect/generic and not guaranteed for webhook actorless updates.
- Refund/cancel APIs are not documented in API contract and are not exposed.

## Notification Flows
Implemented:
- Notification model and queue persistence.
- Provider dispatch helper.
- OTP and bulk message enqueue paths.

Partial:
- No background retry worker/job.
- Not all documented lifecycle events automatically enqueue notifications.
- Marketing opt-in/unsubscribe is not modeled.
- In-app customer notification routes exist but were not in API contract.

## Audit Logs
Implemented:
- Shared admin mutation audit logging for generic service updates/transitions/deletes.
- Audit log model and admin list route.

Partial:
- Auth login/logout audit is missing.
- Actorless payment webhooks do not write audit records.
- Inline route handlers do not all call `writeAuditLog`.
- Audit immutability is conventional, not schema-enforced.

## Required Fixes
- Add endpoint-specific validators for documented payloads and query filters.
- Add Mongo query sanitization middleware.
- Add request logger middleware.
- Add dedicated reports module or document accepted inline route exception.
- Add audit logs for login/logout, webhooks, bulk messaging, and inline admin mutations.
- Add lifecycle notification enqueues for key events.
- Add transaction support for payment/deal/property and closure workflows.
- Expand Swagger with schemas, request bodies, parameters, auth, and response models.
- Expand automated tests beyond health/OpenAPI/basic OTP/workflow guards.
