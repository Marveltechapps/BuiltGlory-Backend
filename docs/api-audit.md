# API Audit

Legend:
- OK: route exists and core auth/behavior is implemented.
- PARTIAL: route exists but validation, response shape, filtering/sorting, Swagger, or workflow semantics are incomplete.
- MISSING: route not found.

## Customer And Auth APIs

| Endpoint | Status | Issues | Required Fixes |
| --- | --- | --- | --- |
| POST `/auth/customer/otp/send` | PARTIAL | Route and validator exist. OTP provider is queue-backed, not real SMS. Response is not wrapped in common `data/meta` shape. | Decide response wrapping, configure provider, add provider tests. |
| POST `/auth/customer/otp/verify` | PARTIAL | Route exists. Response returns raw Mongoose user object shape, not exact contract user DTO. | Add auth response DTO. |
| POST `/auth/admin/login` | PARTIAL | Route exists. Login audit missing. Response returns raw admin object including internal fields unless serialization hides them. | Add login audit and admin DTO. |
| POST `/auth/refresh` | OK | Route exists with refresh token validation and Redis-backed revocation. | Add tests. |
| POST `/auth/logout` | PARTIAL | Revokes refresh token. Logout audit missing. | Add audit log for admin logout. |
| GET `/me` | PARTIAL | Route exists. Response is raw user model, not exact profile DTO. | Add profile DTO. |
| PATCH `/me` | PARTIAL | Route exists. Generic update validator allows unknown fields. | Add exact Joi schema for profile fields. |
| GET `/properties` | PARTIAL | Route exists and filters public statuses. Query validator does not enforce documented filters; repository does exact-key matching only, no min/max price/area, bhk, featured/upcoming aliases, or price sorting. | Add property query validator and filter builder. |
| GET `/properties/:propertyId` | PARTIAL | Route exists and restricts public statuses. Does not include allowed documents or recommendations. | Add detail DTO with documents/recommendations. |
| POST `/properties/:propertyId/save` | OK | Route exists and is idempotent. | Add contract tests. |
| DELETE `/properties/:propertyId/save` | OK | Route exists. | Add contract tests. |
| GET `/me/favorites` | PARTIAL | Route exists. No pagination metadata. | Add pagination. |
| POST `/buy-enquiries` | PARTIAL | Route exists and service validates key business rules. Generic validator does not enforce request schema. Response is raw document. | Add exact Joi schema and response DTO. |
| GET `/me/buy-enquiries` | OK | Owner-scoped list exists with pagination. | Add related visit/deal projection tests. |
| GET `/me/buy-enquiries/:enquiryId` | PARTIAL | Owner-scoped get exists. Does not aggregate related visits, chats, deal status. | Add detail aggregation. |
| PATCH `/me/buy-enquiries/:enquiryId/cancel` | PARTIAL | Route calls transition without forcing `closed`; request body must carry status. Also no active deal check. | Force cancel target and block active deals. |
| POST `/visits` | PARTIAL | Route exists and service validates future visible property. Generic validator incomplete. | Add exact Joi schema. |
| PATCH `/visits/:visitId/reschedule` | OK | Route forces `rescheduled` and appends history. | Add tests. |
| PATCH `/visits/:visitId/cancel` | OK | Route forces `cancelled` and requires reason. | Add tests. |
| POST `/sell-requests` | PARTIAL | Route exists and service validates submission. Generic validator incomplete; docs requirement before approval is partial. | Add exact schema and legal doc validation. |
| POST `/sell-requests/drafts` | OK | Draft route permits incomplete data and stores draft flags. | Add tests. |
| GET `/me/sell-requests` | OK | Owner-scoped list exists. | Add tests. |
| PATCH `/me/sell-requests/:sellRequestId` | PARTIAL | Generic update allows editing statuses that should be protected; service does not restrict customer edits to draft/changes_requested. | Add service guard and exact validator. |
| POST `/me/sell-requests/:sellRequestId/submit` | OK | Route forces `new` and validates submission. | Add tests. |
| POST `/payments/token` | PARTIAL | Route exists and creates gateway order. Requires configured gateway, no local test double. Generic validator incomplete. | Add exact schema and integration test with mocked gateway. |
| POST `/payments/webhook` | PARTIAL | Raw body and signature check exist. No audit log and no transaction. | Add audit and transaction. |
| GET `/me/payments` | OK | Owner-scoped list exists. | Add tests. |
| POST `/callbacks` | PARTIAL | Route exists and service sets SLA. Generic validator incomplete. | Add exact schema. |
| POST `/support/tickets` | PARTIAL | Route exists and service sets SLA/open status. Generic validator incomplete. | Add exact schema. |
| GET `/me/support/tickets` | OK | Owner-scoped list exists. | Add tests. |

## Admin APIs

| Endpoint | Status | Issues | Required Fixes |
| --- | --- | --- | --- |
| GET `/admin/overview` | PARTIAL | Auth and aggregation exist. Response has empty `recentActivities`; permission uses `sales.read` only. | Add activity feed and dedicated dashboard/read permission if desired. |
| GET `/admin/properties` | PARTIAL | Route exists. Generic filters miss `featured`, `upcoming`, aliases, range filters, sort values. | Add filter builder. |
| POST `/admin/properties` | PARTIAL | Route exists. Generic validator permits incomplete/malformed body. | Add exact create schema. |
| GET `/admin/properties/:propertyId` | PARTIAL | Route exists. Does not aggregate activity history/source details beyond raw document. | Add detail aggregation. |
| PATCH `/admin/properties/:propertyId` | PARTIAL | Generic validator; publish flags do not require `properties.publish`. | Add exact validator and permission split. |
| POST `/admin/properties/:propertyId/media` | PARTIAL | Uploads metadata and attaches media. Public CDN/approval workflow missing. | Add approval/CDN flow. |
| PATCH `/admin/properties/:propertyId/status` | PARTIAL | Transition exists. Reserved can be set without token-paid deal because admin override is implicit. | Require explicit override note or token deal. |
| POST `/admin/properties/bulk-upload` | PARTIAL | CSV/XLSX validation exists. Import is not performed and CSV parser is simple. | Add import step or clarify validation-only contract; improve CSV parser. |
| GET `/admin/users` | PARTIAL | Route exists. Generic filters only. | Add KYC/FEMA/role/block/assignment filters. |
| GET `/admin/users/:userId` | PARTIAL | Raw user only; lacks related enquiries, visits, deals, listings, tickets, audit. | Add aggregation. |
| PATCH `/admin/users/:userId/block` | PARTIAL | Generic update with `users.read`; should require write/admin permission and exact body. | Add permission and validator. |
| PATCH `/admin/users/:userId/assign` | PARTIAL | Generic update with `users.read`. | Add permission and exact validator. |
| PATCH `/admin/users/:userId/kyc` | PARTIAL | Route exists but document roll-up logic is incomplete. | Add KYC document update service. |
| PATCH `/admin/users/:userId/fema` | PARTIAL | Route exists. FEMA applies to NRI/PIO but validator does not enforce status/notes. | Add exact validator. |
| GET `/admin/buy-enquiries` | PARTIAL | Route exists. Generic filters. | Add status/assigned/stale/duplicate filters. |
| GET `/admin/buy-enquiries/:enquiryId` | PARTIAL | Raw enquiry only; duplicate/stale warnings and related context partial. | Add detail aggregation. |
| PATCH `/admin/buy-enquiries/:enquiryId` | PARTIAL | Generic update can bypass transitions. | Route status changes through transition service. |
| POST `/admin/buy-enquiries/:enquiryId/convert-to-deal` | OK | Source enquiry conversion implemented. | Add tests. |
| GET `/admin/sell-requests` | PARTIAL | Generic filters. | Add status/completeness/city/assignee/KYC filters. |
| GET `/admin/sell-requests/:sellRequestId` | PARTIAL | Raw document; similar properties/review history missing. | Add detail aggregation. |
| PATCH `/admin/sell-requests/:sellRequestId/review` | PARTIAL | Uses transition decision. Exact decision validator missing. | Add review schema. |
| POST `/admin/sell-requests/:sellRequestId/create-acquisition` | OK | Conversion derives from sell request. | Add tests. |
| GET `/admin/acquisitions` | PARTIAL | Route exists. `city` query does not map to `propertyCity`. | Add filter mapping. |
| GET `/admin/acquisitions/:acquisitionId` | PARTIAL | Raw document only. | Add detail aggregation. |
| PATCH `/admin/acquisitions/:acquisitionId/stage` | OK | Transition guards exist. | Add tests. |
| PATCH `/admin/acquisitions/:acquisitionId/valuation` | PARTIAL | Generic update; does not force valuation field shape. | Add exact validator. |
| PATCH `/admin/acquisitions/:acquisitionId/negotiation` | PARTIAL | Generic update. | Add exact validator. |
| PATCH `/admin/acquisitions/:acquisitionId/token` | PARTIAL | Generic update. | Add exact validator. |
| PATCH `/admin/acquisitions/:acquisitionId/documentation` | PARTIAL | Generic update. | Add legal checklist schema. |
| PATCH `/admin/acquisitions/:acquisitionId/payout` | PARTIAL | Generic update. | Add payout schema. |
| POST `/admin/acquisitions/:acquisitionId/convert-to-property` | OK | Requires acquired stage and creates draft property. | Add transaction/test. |
| GET `/admin/sales/deals` | PARTIAL | Generic filters; buyer type/payment state filters incomplete. | Add filter mapping. |
| GET `/admin/sales/deals/:dealId` | PARTIAL | Raw deal; related payment/visit/chat/interior context missing. | Add detail aggregation. |
| PATCH `/admin/sales/deals/:dealId/stage` | OK | Transition map exists. | Add tests. |
| PATCH `/admin/sales/deals/:dealId/offer` | OK | Updates financial offer fields. | Add validation. |
| PATCH `/admin/sales/deals/:dealId/token-payment` | PARTIAL | Updates token fields and reserves property; no audit transaction. | Add transaction and exact validator. |
| PATCH `/admin/sales/deals/:dealId/payment-plan` | PARTIAL | Updates payment type/total. Does not validate total <= agreed price. | Add validation. |
| PATCH `/admin/sales/deals/:dealId/close` | PARTIAL | Enforces KYC/FEMA/payment and side effects. No transaction. | Add transaction. |
| PATCH `/admin/sales/deals/:dealId/lost` | OK | Requires lost reason. | Add tests. |
| GET `/admin/visits` | PARTIAL | Route exists with generic filters. | Add date/status/admin filters. |
| GET `/admin/visits/:visitId` | PARTIAL | Raw visit only. | Add buyer/property/context aggregation. |
| PATCH `/admin/visits/:visitId/status` | OK | Transition guard exists. | Add tests. |
| POST `/admin/visits/:visitId/feedback` | PARTIAL | Generic update; next action side effects incomplete. | Add feedback service action. |
| POST `/admin/visits/:visitId/call-logs` | PARTIAL | Generic update can overwrite call logs; should append. | Add append action. |
| GET `/admin/callbacks` | PARTIAL | Route exists. Generic filters. | Add SLA filters. |
| GET `/admin/callbacks/:callbackId` | OK | Route exists. | Add tests. |
| POST `/admin/callbacks/:callbackId/attempts` | OK | Appends attempts. | Add tests. |
| PATCH `/admin/callbacks/:callbackId/resolve` | OK | Requires notes. | Add tests. |
| PATCH `/admin/callbacks/:callbackId/reschedule` | OK | Requires future preferred time/reason. | Add tests. |
| GET `/admin/negotiations/chats` | PARTIAL | Route exists. Generic filters. | Add deadline/long negotiation filters. |
| GET `/admin/negotiations/chats/:threadId` | OK | Route exists. | Add tests. |
| POST `/admin/negotiations/chats/:threadId/messages` | OK | Appends message/offer. | Add tests. |
| PATCH `/admin/negotiations/chats/:threadId/offers/:messageId` | OK | Accept/decline/counter implemented. | Add tests. |
| GET `/admin/interior/leads` | PARTIAL | Route exists. Generic filters. | Add SLA/designer/status filters. |
| GET `/admin/interior/leads/:leadId` | OK | Route exists. | Add tests. |
| PATCH `/admin/interior/leads/:leadId` | PARTIAL | Service validates quote/accept/complete, but route uses generic update. | Add exact validator. |
| GET `/admin/support/tickets` | PARTIAL | Generic filters. | Add priority/SLA/escalation filters. |
| GET `/admin/support/tickets/:ticketId` | OK | Route exists. | Add tests. |
| POST `/admin/support/tickets/:ticketId/responses` | OK | Appends response. | Add notification enqueue. |
| PATCH `/admin/support/tickets/:ticketId` | PARTIAL | Generic update. | Add exact schema and status transition guard. |
| GET `/admin/sales-team` | OK | Route exists. | Add tests. |
| GET `/admin/designers` | OK | Route exists. | Add tests. |
| GET `/admin/message-templates` | PARTIAL | Static templates only. | Add DB/template config if required. |
| POST `/admin/bulk-messages` | PARTIAL | Queues notifications. No marketing opt-in enforcement. | Add opt-in checks and audit. |
| GET `/admin/audit-logs` | OK | Route exists with permission. | Add immutable tests. |

## Swagger Coverage
Path coverage: 100%

Schema/detail coverage: PARTIAL. Request bodies, parameters, response schemas, auth declarations, and error payload schemas are incomplete.
