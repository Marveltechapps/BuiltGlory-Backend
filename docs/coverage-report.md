# Coverage Report

## Command

```bash
npm test -- --coverage
```

## Result
- Test suites: 16 passed
- Tests: 69 passed
- Statement coverage: 78.06%
- Branch coverage: 55.91%
- Function coverage: 79.18%
- Line coverage: 84.50%

## Added Coverage In This Pass
- MongoDB-memory-backed Supertest integration harness.
- Auth, protected route, customer/admin token, and RBAC denial/allow tests.
- Property browse/save/admin create/publish/media/bulk-upload tests.
- Buy enquiry conversion, visit reschedule/cancel, acquisition, and sales deal workflow tests.
- Payment token creation, idempotency, webhook signature/replay, and upload rejection tests.
- Support ticket, callback, interior lead, notification, reports, audit, and admin utility integration tests.
- Auth refresh rotation/reuse/logout and service-level business-rule tests.
- Compliance, legal document, storage, and notification provider branch tests.
- Health, readiness, metrics, and OpenAPI smoke checks.

## Gap Against Target
Target coverage was 80% statements, 70% branches, and 80% functions.

Measured coverage is 78.06% statements, 55.91% branches, and 79.18% functions. This is a material improvement from the previous 46.68% / 14.07% / 31.54%, but the requested target is not honestly met yet.

## Recommended Next Tests
- Branch-heavy negative-path tests for user KYC/FEMA updates, acquisition gates, sales deal lost/re-engagement, visit missed/completed, and support escalation failures.
- More route coverage for sell request draft/submit/change-request paths and buy enquiry validation once the `propertySnapshot.type` schema issue is corrected.
- Additional notification retry/dead-letter and background job edge-case tests.
- Optional coverage-scope cleanup to exclude generated one-line boilerplate from production coverage metrics, if that is accepted as the reporting policy.
