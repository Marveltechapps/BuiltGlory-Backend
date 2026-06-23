# Notifications Architecture

```mermaid
flowchart LR
  API[API Services] --> Enqueue[enqueueNotification]
  Enqueue --> Prefs[User Preferences]
  Prefs -->|allowed| Queue[(Notifications Collection)]
  Prefs -->|opted out| Cancelled[Cancelled Notification]
  Queue --> Worker[Notification Retry Worker]
  Worker --> SMS[SMS Provider]
  Worker --> WhatsApp[WhatsApp Provider]
  Worker --> Email[Email Provider]
  Worker --> Push[Push Provider]
  Worker --> InApp[In-App]
  Worker -->|success| Sent[Sent/Delivered]
  Worker -->|retryable failure| Retry[Backoff + nextAttemptAt]
  Retry --> Queue
  Worker -->|max attempts| DLQ[Dead Letter Queue]
```

## Channels
- `sms`
- `whatsapp`
- `email`
- `push`
- `in_app`

## Delivery Tracking
- `status`
- `attempts`
- `maxAttempts`
- `nextAttemptAt`
- `sentAt`
- `deliveredAt`
- `failedAt`
- `deadLetterAt`
- `failureReason`
- `providerResponse`

## Preference Rules
- Transactional notifications default to enabled.
- Marketing notifications default to disabled.
- Opt-out creates a `cancelled` notification record for auditability.
- Exhausted retries move the notification to `dead_letter`.
