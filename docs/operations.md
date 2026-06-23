# Operations Runbook

## Seed

```bash
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='change-me' npm run seed
```

Creates the initial super admin if it does not already exist.

## Migration

```bash
npm run migrate
```

Synchronizes core indexes. Production migrations should be run once per release before traffic is shifted.

## Backup Strategy

- Enable automated MongoDB snapshots with point-in-time recovery.
- Export daily logical backups for critical collections: `users`, `admins`, `properties`, `salesDeals`, `payments`, `documents`, `auditLogs`.
- Retain daily backups for 30 days and monthly backups for 12 months.
- Replicate S3 document buckets and quarantine buckets across availability zones or regions.

## Recovery Strategy

- Restore MongoDB snapshot into a staging cluster first.
- Verify `payments`, `salesDeals`, `properties`, and `auditLogs` counts before production cutover.
- Rebuild indexes with `npm run migrate`.
- Re-point API secrets only after validation.
- Run smoke tests: health, ready, admin login, property list, payment webhook dry run.

## Deployment Checklist

- `NODE_ENV=production`
- Strong JWT access and refresh secrets configured.
- `JWT_ISSUER` and `JWT_AUDIENCE` configured and stable.
- Explicit `CORS_ORIGINS` configured.
- `REDIS_URL` configured for sessions, rate limits, jobs, and locks.
- MongoDB replica set enabled for transactions.
- S3 bucket and quarantine bucket configured.
- Razorpay keys and webhook secret configured.
- SMS, WhatsApp, Email, and Push provider credentials configured.
- `npm run migrate` completed.
- `npm test -- --coverage` completed.
- k6 smoke/load test completed against staging.
- Alerting configured for 5xx rate, webhook failures, notification dead letters, job failures, and payment reconciliation drift.
