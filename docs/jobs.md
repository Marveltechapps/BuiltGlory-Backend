# Background Jobs

## Runner
Command:

```bash
npm run jobs:run
```

Entry points:
- `src/jobs/index.js`
- `src/jobs/runner.js`

## Recommended Cron Schedule

| Job | Function | Suggested Schedule |
| --- | --- | --- |
| Callback overdue detection | `markOverdueCallbacks` | Every 5 minutes |
| Support ticket overdue detection | `markOverdueSupportTickets` | Every 5 minutes |
| Visit reminder | `enqueueVisitReminders` | Every 30 minutes |
| Visit follow-up | `enqueueVisitFollowUps` | Hourly |
| Deal follow-up | `enqueueDealFollowUps` | Hourly |
| Notification retry | `processNotificationQueue` | Every minute |
| Document scan retry | `retryDocumentScans` | Every 15 minutes |
| Stage aging calculation | `calculateStageAging` | Hourly |

## Operational Notes
- Production should run these jobs in a worker process separate from the API server.
- Notification retry uses `nextAttemptAt`, `attempts`, `maxAttempts`, and `dead_letter` status.
- Document scan retry keeps scan status pending until a malware scanner integration marks files clean/infected.
- Stage aging updates active acquisition and sales deal records from last activity timestamps.
