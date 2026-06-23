# Database Audit

## Overall Status
Status: PARTIALLY IMPLEMENTED

All required domain collections are present as Mongoose schemas. The implementation covers timestamps, most enums, references, indexes, and soft deletes. Gaps remain in exact field completeness for some collections, data integrity hooks, roll-up validations, and transaction-backed relationship rules.

## Collection Coverage

### users
Status: PARTIALLY IMPLEMENTED

Implemented:
- `referenceId`, identity/contact fields, `userType`, `role`, KYC fields, FEMA compliance, metrics, assignment, active/block flags.
- Unique `phoneNormalized`, sparse unique `email`, `referenceId`, compound and text indexes.
- `profileComplete` virtual.
- Timestamps and soft delete plugin.

Missing / Partial:
- Email format is not enforced at schema level.
- KYC status roll-up from document statuses is not implemented as a hook.
- Required KYC document matrix is not modeled.
- `phone` formatting and normalization are enforced mainly through auth flow, not schema-level validation.

### admins
Status: PARTIALLY IMPLEMENTED

Implemented:
- Role, permissions, password hash, availability, workload, assigned areas, specialization.
- Unique email and role/active/available index.
- Timestamps.

Missing / Partial:
- Password hash selection is hidden in auth service, but schema should explicitly select false or protect serialization.
- Email format is not enforced at schema level.
- No password rotation/session inactivity record in Mongo.

### properties
Status: PARTIALLY IMPLEMENTED

Implemented:
- Core fields, nested address/specs/media/advantages/nearby/metrics, references, soft delete fields.
- Enums for status/source/type.
- Required reference/title/type/price and key indexes including text and optional geospatial.
- Upcoming property `launchDate` hook.

Missing / Partial:
- `address.location` GeoJSON is optional and not automatically derived from latitude/longitude.
- Publication validation lives in workflow service, not schema.
- Basic specifications by property type are not enforced.
- Public DTO fields from API contract are not flattened from nested schema.

### buyEnquiries
Status: PARTIALLY IMPLEMENTED

Implemented:
- Buyer/property refs and snapshots, contact/interest/preference enums, status, assignment, duplicate reference.
- Required buyer/property/contact/interest fields and indexes.

Missing / Partial:
- Stale relative visit preference flag is not stored or indexed.
- Duplicate detection uses buyer/property, not explicitly normalized phone across users.
- Additional dashboard context is not materialized in schema.

### sellRequests
Status: PARTIALLY IMPLEMENTED

Implemented:
- Seller refs/snapshots, property basics, address, documents, status, draft fields, metrics, sale info.
- Status enum and indexes.

Missing / Partial:
- Schema allows incomplete non-draft documents; service validates some submission fields.
- Ownership/legal document requirement before approval is not fully enforced.
- `sellerKycStatus` is only in snapshot, not a first-class indexed field.
- Loan supporting documents are not explicitly modeled.

### acquisitions
Status: PARTIALLY IMPLEMENTED

Implemented:
- Stage, createdFrom, sell request/seller refs, snapshots, pricing, assignment, media/detail buckets, history.
- Stage indexes and sell request index.

Missing / Partial:
- Stage-specific checklist fields are flexible `Mixed`, not strongly modeled.
- Final purchase price immutability after acquired is not schema-enforced.
- No transaction metadata for conversion workflows.

### salesDeals
Status: PARTIALLY IMPLEMENTED

Implemented:
- Stage, priority, buyer/property refs and snapshots, financials, source enquiry, lost/closed/reengagement, photos, history.
- Stage, buyer, property, source enquiry indexes.

Missing / Partial:
- `buyerType` is only in snapshot, not a first-class indexed/filterable field.
- Total paid <= agreed price is service-level partial, not schema-level validation.
- One reserved/token-paid buyer per property is service-side partial, not unique/index-enforced.

### visits
Status: PARTIALLY IMPLEMENTED

Implemented:
- Buyer/property/enquiry refs, date/time/type/platform/link, status, assigned admin, reschedule history, feedback, call logs.
- Required date/type and indexes.

Missing / Partial:
- Buyer/property snapshots are not stored though admin detail expects context.
- Excessive reschedule flag is not modeled.
- Feedback next action side effects are partial.

### callbacks
Status: IMPLEMENTED

Implemented:
- User/property refs, source/category/reason/preference, status, SLA, attempts, assignment, resolution notes.
- SLA and queue indexes.

Missing / Partial:
- User contact verification flag on wrong number is not modeled on callback or user.

### chatThreads
Status: PARTIALLY IMPLEMENTED

Implemented:
- Buyer/property/deal refs, status, negotiation summary, embedded messages, message/offer enums, indexes.

Missing / Partial:
- Long negotiation flag and deadline-highlight fields are not materialized.
- Customer-side chat routes are not exposed.

### interiorLeads
Status: PARTIALLY IMPLEMENTED

Implemented:
- Buyer/property refs, selected rooms, style, budget, userType, status, SLA, designer, quote, acceptance/completion/notes.
- SLA/designer/buyer indexes.

Missing / Partial:
- No customer-facing creation route in API contract, but model supports creation.
- Remote coordination notes are optional and not automatically applied for NRI/PIO.

### supportTickets
Status: IMPLEMENTED

Implemented:
- User ref, category, subject, message, status, priority, assignee, escalation, SLA, attachments, responses.
- Queue/user/date indexes.

Missing / Partial:
- Overdue ticket state is not first-class.
- Auto-close window is not modeled.

### payments
Status: PARTIALLY IMPLEMENTED

Implemented:
- User/deal/property refs, type/status enums, gateway IDs/signature, idempotency key, paid/failure/provider fields.
- Unique/sparse gateway indexes and compound indexes.

Missing / Partial:
- `idempotencyKey` is indexed but not unique.
- Payment status changes are not all transaction-backed.
- Refund/cancel details are not expanded.

### documents
Status: PARTIALLY IMPLEMENTED

Implemented:
- Owner type/id, purpose, document type, file metadata, storage key/url, status, verifier fields, scan status, privacy flag.
- Owner/purpose and status/type indexes.

Missing / Partial:
- Retention policy is not modeled.
- Malware scan provider/result details are minimal.
- No lifecycle cleanup fields.

### notifications
Status: PARTIALLY IMPLEMENTED

Implemented:
- User/admin refs, event, channel, status, recipient, template/payload/provider response, attempts, scheduling timestamps, marketing flag.
- Queue/user/event indexes.

Missing / Partial:
- Marketing opt-in/unsubscribe state not modeled.
- Retry backoff policy is not modeled beyond `nextAttemptAt`.

### auditLogs
Status: IMPLEMENTED

Implemented:
- Actor/action/resource/before/after/ip/user-agent fields.
- Resource, actor, and action indexes.

Missing / Partial:
- Immutability is not enforced via schema middleware.
- No TTL/retention policy, which is an open business decision.

## Cross-Cutting Database Gaps
- Generic schemas do not include many endpoint-specific validation constraints.
- Most multi-document integrity rules are service-level and not transaction-backed.
- No migration/seed scripts from frontend mock data.
- No automatic metrics backfill job.
- No schema-level Mongo sanitization; query filtering is generic.
