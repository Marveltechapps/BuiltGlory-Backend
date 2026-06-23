# Security Audit

## Overall Status
Status: PARTIALLY IMPLEMENTED

The backend has the expected security baseline: Helmet, CORS, rate limits, JWT, refresh-token revocation, password hashing, RBAC, request validation, upload restrictions, and payment webhook verification. Production hardening gaps remain.

## JWT Security
Implemented:
- JWT access and refresh tokens use separate secrets.
- Admin access token expires using inactivity seconds.
- Token type is enforced by route.

Issues:
- Tokens are accepted only from Authorization header; dashboard cookie strategy is not implemented.
- No token audience/issuer claims.
- No access-token denylist after logout.

Required fixes:
- Add `issuer`/`audience` configuration and verification.
- Decide cookie strategy for dashboard deployment.

## Refresh Tokens
Implemented:
- Refresh tokens contain `jti`.
- Refresh token hashes are stored in Redis and revoked on logout.

Issues:
- Device/session metadata is not persisted beyond OTP request payload.
- Rotation/reuse detection is not implemented.

Required fixes:
- Store device/session metadata with refresh tokens.
- Rotate refresh tokens on refresh and detect reuse.

## OTP And Rate Limiting
Implemented:
- OTP expiry, retry count, resend cooldown, auth and OTP rate limits.
- OTP values are hashed and not returned.

Issues:
- Real SMS/OTP provider not configured by default.
- Rate limit store defaults to memory unless Redis is configured.

Required fixes:
- Configure Redis in production.
- Configure SMS provider and add provider failure handling tests.

## Password Hashing
Implemented:
- Admin login verifies bcrypt hashes.
- Password hash is not returned by login selection unless explicitly selected.

Issues:
- Admin creation/password reset flow is not exposed.
- Schema does not enforce `select: false` for `passwordHash`.

Required fixes:
- Add admin password management flow or seed script.
- Protect `passwordHash` serialization at schema level.

## RBAC And Permission Checks
Implemented:
- Role-permission map exists.
- Admin routes use `requirePermission`.

Issues:
- Some sensitive operations use broad write permissions (`sales.write`, `properties.write`).
- `properties.publish` is not used on publish/editorial flag changes.
- Final permission matrix is an open decision.

Required fixes:
- Add elevated permissions for financial/closure/publish operations.

## Input Validation
Implemented:
- Joi validation middleware exists.
- Auth validators are specific.

Issues:
- Most module validators are generic and allow unknown payload fields.
- Query parameters can include arbitrary keys that become Mongo filters.

Required fixes:
- Add exact endpoint-specific Joi validators.
- Add Mongo query sanitization.

## Mongo Injection Protection
Implemented:
- Mongoose is used.
- Validation strips unknown fields only when schemas define them.

Issues:
- Generic list filters copy query keys into Mongo filters.
- No explicit `$`/`.` key sanitization middleware.

Required fixes:
- Add sanitization middleware and allowlisted filter builders.

## XSS, Headers, CORS
Implemented:
- Helmet enabled.
- CORS enabled.
- JSON body limit set.

Issues:
- CORS is open when `CORS_ORIGINS` is unset.
- No response escaping layer, relying on JSON clients.

Required fixes:
- Require explicit CORS allowlist in production.

## File Upload Security
Implemented:
- Multer memory storage with 25MB limit.
- File type validation for documents/media.
- Private default for non-property media.
- Scan status field exists.

Issues:
- No real malware scanner.
- Multipart upload route uploads to S3 immediately before scan is clean.
- CDN/public approval workflow not implemented.

Required fixes:
- Add malware scan provider/job and block public use until clean.

## Webhook Verification
Implemented:
- Raw body configured for payment webhook.
- Razorpay HMAC verification helper exists.

Issues:
- `timingSafeEqual` can throw if signature lengths differ.
- Webhook does not audit payment status change.
- No replay protection.

Required fixes:
- Harden signature compare, add audit, add replay/idempotency handling by event ID.

## Audit Logs
Implemented:
- Generic admin service writes audit logs.

Issues:
- Inline routes do not consistently audit.
- Admin login/logout and webhook status changes are not audited.
- Audit records are not schema-immutable.

Required fixes:
- Add audit logging to auth, inline admin actions, and webhooks.
- Add pre-update/delete guard on audit log model.

## Dependency Risks
Observed:
- `npm audit --audit-level=high` passes.
- Remaining moderate transitive audit findings require breaking changes according to npm.

Required fixes:
- Track moderate advisories and upgrade when compatible releases are available.

## Production Risks
- Provider credentials are required for S3, Razorpay, SMS, WhatsApp, email, and push.
- Redis is required in production for distributed rate limits/session revocation.
- Multi-document financial and inventory changes should use MongoDB transactions.
- Test coverage is too light for production readiness.
