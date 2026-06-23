# Backend Scorecard

## Executive Summary

The backend is a broad and reasonably well-organized Express/Mongoose implementation with all major modules and documented route groups present. It is much more than a prototype: it has authentication, RBAC, validators, workflows, S3/payment/notification boundaries, audit logs, OpenAPI, Postman artifacts, background jobs, and load-test scaffolding.

It is **not production ready**. The main blockers are shallow automated test coverage, incomplete endpoint-specific Swagger/DTO fidelity, unproven external-provider integrations, incomplete operational maturity around jobs/queues/scans/report exports, and several security/design gaps that need hardening before real money/property workflows are safe.

Final verdict: **Beta Ready**.

Overall Score: **70/100**

Grade: **C**

## Detailed Review Scores

| Criterion | Score | Why |
| --- | ---: | --- |
| Project Architecture | 8.0/10 | Clean Express app composition, module-based design, shared factories, middleware layering, OpenAPI endpoint, health endpoints. Still lacks deeper production infrastructure boundaries for queues, workers, provider adapters, migrations, and observability. |
| Folder Structure | 8.5/10 | Matches the requested `src/modules`, `middleware`, `services`, `shared`, `jobs`, `docs`, `tests` layout. Each main module has the expected file set. Some modules are thin or placeholder-like, especially reports schema/model and several permission files. |
| Code Quality | 7.0/10 | Code is readable and consistent, but many files compress complex logic into long single-line objects/functions. Generic factories reduce duplication but also hide endpoint-specific behavior and make DTO/business-rule precision weaker. |
| Module Separation | 7.5/10 | Module boundaries are mostly respected. Cross-module workflow dependencies exist in services, which is acceptable, but some route handlers still contain business logic and dynamic imports. |
| Database Design | 8.0/10 | All major collections exist. Core references, statuses, timestamps, soft delete, and indexes are present. Redis-backed OTP/session state is reasonable. Field-level fidelity and operational data modeling still need refinement. |
| MongoDB Schema Design | 7.5/10 | Schemas use enums, references, unique IDs, indexes, and soft delete. Some fields remain loose `Mixed`, nested checklists are not fully normalized, and several constraints are enforced only in services rather than schema-level invariants. |
| Indexing Strategy | 7.0/10 | Useful indexes exist for status, owner, date, text search, and common lookups. It is not yet workload-validated; compound indexes for high-volume dashboard/report queries and unique active-workflow constraints are incomplete. |
| API Design | 7.5/10 | All documented route groups appear present and response envelopes are broadly consistent. Exact DTO matching against `api-contract.md` is not guaranteed; many endpoints return raw Mongoose documents. |
| REST Standards | 7.5/10 | Uses appropriate verbs and route grouping for most operations. Some action endpoints are pragmatic but RPC-like, which is acceptable for workflows but not purely RESTful. |
| Authentication | 7.5/10 | Customer OTP and admin login are implemented with JWT access/refresh tokens, OTP hashing, resend cooldown, Redis storage, and refresh rotation. Gaps: no JWT issuer/audience, no access-token denylist, customer logout/session invalidation has a likely gap, and dashboard cookie strategy is absent. |
| Authorization | 7.5/10 | Admin/customer route separation exists and customer ownership checks were added to generic update/transition flows. Some inline routes and broad permissions still need more granular review. |
| RBAC | 7.0/10 | Role-permission map and `requirePermission` middleware exist. Sensitive financial, closure, publishing, and override operations still rely too much on broad write permissions. |
| Business Rule Coverage | 7.0/10 | Many state transitions and workflow gates exist, including KYC/FEMA/legal checks. Coverage is uneven: several operational side effects, exact rule matrices, visit next-action behavior, report generation, scan lifecycle, and provider workflows remain partial. |
| Validation Coverage | 7.0/10 | Joi validators exist for every module and many have strict `unknown(false)`. Some status/update validators still accept generic payloads or nested `unknown(true)` objects, leaving mass-assignment and contract drift risk. |
| Error Handling | 8.0/10 | Central `AppError`, consistent error envelope, request IDs, and 500 logging are in place. Domain errors are broadly handled. Some inline route error responses bypass shared helpers. |
| Logging | 7.0/10 | Request logger and Winston logging exist. Production-grade structured logs, correlation across workers/providers, metrics, and tracing are not complete. |
| Audit Logs | 7.0/10 | Audit log model is immutable via schema hooks and generic admin mutations are audited. Gaps: customer actor audit is skipped, inline mutations are not exhaustively audited, and audit coverage is not tested endpoint-by-endpoint. |
| File Upload Architecture | 6.5/10 | S3 signed URL and multipart upload flows exist, with file size/type validation and scan status fields. No real malware scanner, no quarantine pipeline, no CDN/public approval workflow, and provider behavior is not tested. |
| Payment Architecture | 7.0/10 | Razorpay order boundary, webhook signature verification, replay protection fields, idempotency, and transactions for key side effects exist. Still needs stronger provider contract tests, refund/cancel lifecycle, reconciliation, and exact amount-unit handling verification. |
| Notification Architecture | 6.5/10 | Notification model, queue records, preferences, retry/backoff, dead-letter status, and provider dispatch helper exist. It is not a robust production queue: no BullMQ/SQS, no concurrency controls, no provider-specific adapters/templates, and no delivery webhooks. |
| Background Jobs | 6.0/10 | Job functions and CLI runner exist for overdue detection, reminders, retries, scans, and aging. They are basic scripts, not production schedulers with locking, idempotency, monitoring, retry isolation, or horizontal-safe execution. |
| Security | 7.2/10 | Solid baseline: Helmet, rate limits, JWT, Redis refresh sessions, bcrypt, RBAC, Joi, Mongo sanitization, webhook HMAC, immutable audit logs. Gaps: open CORS default, no JWT issuer/audience, weak logout/session edge cases, no real malware scanning, limited tests, and broad privileged permissions. |
| Swagger/OpenAPI | 6.5/10 | Path coverage exists and reusable components were added. Endpoint-specific schemas, examples, auth declarations, permissions, error responses, and DTO fidelity are still shallow. |
| Test Coverage | 3.5/10 | Measured statement coverage is 40.66%, branch coverage 8.48%, function coverage 19.32%. Only 9 Jest tests exist. There are almost no integration tests for auth/session, payments, transactions, RBAC, uploads, jobs, or workflows. |
| Scalability | 6.5/10 | Mongo/Redis/S3 choices can scale, and indexes exist. Current jobs/notifications/report exports are not queue-backed enough for high load. No caching strategy, no metrics-driven capacity plan, no proven load-test run. |
| Maintainability | 7.2/10 | Consistent module skeleton and shared factories help maintainability. Long one-line files, shallow DTO contracts, generic validators, and mixed route/service business logic will make future changes riskier. |
| Production Readiness | 6.5/10 | Structurally close to a full backend but not operationally proven. Provider integrations, tests, load tests, migrations/seeding, monitoring, Swagger fidelity, and security edge cases block production sign-off. |

## Document Compliance

| Area | Compliance | Assessment |
| --- | ---: | --- |
| API Compliance | 86% | All major endpoint paths appear present, but exact request/response DTOs, examples, status codes, filters, and pagination semantics are not fully contract-proven. |
| Database Compliance | 88% | All main collections exist with many documented fields/enums/indexes. Some fields/checklists are loose, some exact schema constraints are service-only, and migration/seed strategy is missing. |
| Business Rule Compliance | 74% | Many lifecycle rules are implemented, but several rules remain partial or untested: legal/scan workflow, visit next actions, notification lifecycle, report generation, payment reconciliation, KYC/FEMA edge cases. |
| Architecture Compliance | 84% | Folder structure and stack align well with the architecture document. Missing production-grade queue workers, provider adapters, metrics/tracing, migration tooling, and robust deployment readiness lower the score. |

## Production Audit

### Production Ready Features

- Module skeleton and route coverage across auth, users, properties, enquiries, visits, sell requests, acquisitions, sales deals, payments, documents, notifications, support, reports, and audit logs.
- Basic Express hardening with Helmet, compression, CORS middleware, rate limiting, request context, request logging, and error handling.
- Mongoose schemas with timestamps, soft delete plugin, references, enums, unique `referenceId`s, and common indexes.
- Customer OTP and admin login flows with hashed OTPs/passwords and Redis-backed refresh token storage.
- RBAC middleware and admin permission checks on most admin routes.
- Payment webhook HMAC verification and replay/idempotency fields.
- Immutable audit log schema hooks.
- OpenAPI endpoint and Postman/k6 artifacts.

### Partially Production Ready Features

- Refresh token security: rotation/reuse detection exists, but JWT claims/session invalidation and logout edge cases need hardening.
- Business workflows: many transitions exist, but side effects and edge cases are not comprehensively covered or tested.
- Validation: improved but still uneven, especially for complex nested payloads and generic status/update validators.
- Notifications: queue persistence exists, but provider-specific delivery, concurrency, templates, and delivery webhooks are not production-grade.
- Background jobs: functions exist, but no distributed scheduler/locking/monitoring.
- Reports: dashboard and summaries exist, but export generation is queued metadata, not complete production file generation.
- File uploads: S3 flow exists, but malware scan and approval lifecycle are incomplete.
- Swagger: path coverage exists, schema/detail coverage remains insufficient.
- Audit logs: useful baseline, but not every mutation is proven audited.

### Not Production Ready Features

- Automated test coverage and workflow regression suite.
- Provider integration confidence for S3, Razorpay, SMS, WhatsApp, Email, Push, Redis production behavior.
- Malware scanning/quarantine/release pipeline.
- Production report export workers for CSV/XLSX/PDF.
- Full endpoint-specific DTO compliance with `api-contract.md`.
- Operational readiness: migrations, seed scripts, metrics, tracing, alerting, runbooks, and load-test results.

## Security Audit

Security Score: **7.2/10**

| Area | Assessment |
| --- | --- |
| JWT | Separate access/refresh secrets and route token-type enforcement exist. Missing issuer/audience, access-token denylist, and cookie/session strategy for dashboard. |
| Refresh Tokens | Rotation, Redis hashes, session metadata, and reuse detection are implemented. Customer logout/session deletion looks incomplete because session deletion is tied to admin actor extraction. Needs tests. |
| Rate Limiting | General, auth, OTP, and upload limiters exist. Production depends on Redis/distributed store; default memory limiter is not enough for multi-instance deployment. |
| Input Validation | Joi coverage exists, but some validators still allow generic/nested unknown payloads. Mongo sanitization helps but does not replace allowlisted filters and DTO validators. |
| RBAC | Good baseline with role permissions and route checks. Sensitive actions need more granular permissions and override auditing. |
| File Upload Security | File size/type checks and private defaults exist. No real malware scanner or quarantine approval pipeline, so this is not production-ready for untrusted files. |
| Webhook Security | HMAC length-safe compare, timestamp checks, provider event ID, duplicate rejection, and transaction side effects exist. Needs provider-contract tests and reconciliation. |
| Audit Logs | Immutable model and generic admin mutation audit exist. Customer mutations are not audited by `writeAuditLog`, and inline route coverage is not proven. |

## Final Scorecard

Architecture Score: **8.0/10**

Database Score: **7.7/10**

API Score: **7.4/10**

Security Score: **7.2/10**

Business Rule Score: **7.0/10**

Code Quality Score: **7.0/10**

Testing Score: **3.5/10**

Scalability Score: **6.5/10**

Maintainability Score: **7.2/10**

Production Readiness Score: **6.5/10**

Overall Score: **70/100**

Grade: **C**

## Final Verdict

**Beta Ready**

This backend is not merely MVP-only because it has broad module coverage, real schemas, real routes, real middleware, partial security hardening, workflow services, payment/upload/notification boundaries, and documentation artifacts. However, it is also not near production ready because the critical proof points are missing: high-confidence tests, provider integration tests, complete Swagger/DTO fidelity, production-grade workers/queues, malware scanning, operational monitoring, and exhaustive audit/security validation.

The backend can support controlled internal demos, QA, contract review, and beta testing with seeded data and mocked providers. It should not handle live customer payments, legal documents, or production property transactions until the remaining test, security, provider, and operational gaps are closed.
