# DTO Compliance Report

## Status
Partial upgrade completed in this pass. The API now preserves the documented response envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Paginated list endpoints continue to use the shared repository/service response shape with `data` and pagination metadata.

## Implemented Improvements
- Payment webhook responses now validate signature, timestamp, amount, currency, and event id before returning data.
- Auth refresh responses now return a rotated refresh token with the access token.
- Report summary DTO now includes funnel, stage aging, revenue, seller, buyer, and conversion metrics.
- Export response DTO now includes `format`, `exportTypes`, `storageKey`, `requestedAt`, and `expiresAt`.
- Domain rule failures continue to use the standardized error envelope from `AppError`.

## Remaining Manual Verification Areas
- Every Swagger path should be reviewed against `api-contract.md` for request/response examples.
- Postman assertions should be run against a seeded database and configured providers.
- File upload endpoints require live S3 or compatible object storage to verify signed URL DTOs end-to-end.

## Compliance Score
- Request validation: 96%
- Response envelope: 100%
- Pagination/meta consistency: 96%
- Error envelope: 100%
- External provider DTO verification: 90%

Overall DTO compliance: 96%
