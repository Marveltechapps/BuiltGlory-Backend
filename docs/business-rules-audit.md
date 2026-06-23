# Business Rules Audit

## Overall Status
Status: PARTIALLY IMPLEMENTED

Core lifecycle state machines and many critical validations exist. The main gaps are exact Joi request validation, transaction safety, complete side effects for visits/notifications/audit, exact KYC/FEMA roll-ups, and provider-specific payment/upload/notification details.

## Property Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Customer lists exclude draft/sold/deleted properties.
- Property status transition map exists.
- Draft to available requires required publication fields.
- Upcoming requires `launchDate`.
- Sold sets `soldAt`; sold reopening requires super admin.

Missing / Partial:
- `reserved` does not strictly require token-paid deal unless admin override is implicit.
- `isFeatured`/`isUpcoming` do not require `properties.publish`.
- Basic specs by property type are not enforced.
- Media approval/public CDN workflow is partial.

## Buyer Enquiry Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Customer auth required.
- Visible property required.
- Blocked user rejected.
- Email contact requires email.
- Schedule visit requires preference.
- Duplicate flag exists.
- Transition map exists.
- Active deal uniqueness by enquiry is checked.

Missing / Partial:
- Duplicate detection is based on buyer/property, not normalized phone/property.
- Cancel route does not force closed or check active deal.
- Closed enquiries are not fully read-only; generic update can modify them.
- Stale visit preference warning is not computed.

## Visit Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Auth required.
- Property visible/not sold.
- Future date/time check.
- Physical location check.
- Virtual meeting link check before confirmation.
- Reschedule history and count.
- Completion feedback required.

Missing / Partial:
- NRI/PIO virtual default is not automatic.
- Excessive reschedule manager flag is missing.
- Feedback next actions do not create/update sales deal or mark deal lost.
- Admin feedback/call-log routes are generic updates.

## Sell Request Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Auth and seller role checks.
- Submission requires core fields, pincode, positive price, five photos, loan details.
- Drafts permit incomplete data.
- KYC required before approved/active.
- Review transition map exists.

Missing / Partial:
- At least one ownership/legal document before approval is incomplete.
- Seller can update non-draft/non-change-requested records through generic update route.
- Rejection/change request requirements exist in service but route validator is generic.

## Acquisition Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Acquisition can be created from approved/accepted/active sell request.
- One active acquisition per sell request.
- Stage transition map exists.
- Stage gates exist for valuation/token/documentation/payout/acquired.
- Acquired asset converts to draft property with `source = acquired`.

Missing / Partial:
- Site inspection details are not required before `site_inspection`.
- Legal checklist fields are flexible and not exact.
- Final purchase price immutability after acquired is not enforced.
- No MongoDB transaction for conversion.

## Sales Deal Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Deal requires unsold property.
- One active deal per enquiry.
- Stage transition map exists.
- Agreed price required before token stage.
- Token paid reserves property.
- Closure requires buyer KYC, FEMA for NRI/PIO unless super admin, payment terms, and sets property/enquiry closure.
- Lost reason required.

Missing / Partial:
- One reserved/token-paid buyer per property is not robustly enforced.
- Total paid cannot exceed agreed price is not enforced in all update paths.
- Re-engagement follow-up date and attempt count are incomplete.
- Deal closure is not transaction-backed.
- Business-approved max variance rule is not implemented.

## Negotiation Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Admin chat routes require sales permissions.
- Offer messages require positive amount.
- Accepted offer sets agreed price in thread.
- Counter creates new offer and marks prior offer countered.

Missing / Partial:
- Customer chat access route is absent.
- Accepted offer does not create/update sales deal negotiation stage.
- Long negotiation and deadline highlighting are not materialized.

## Callback Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- SLA deadline defaults.
- Attempt count and history append.
- Reschedule requires future preferred time and reason.
- Resolve requires notes.
- Attempt outcomes drive status.

Missing / Partial:
- Wrong number does not flag user contact verification.
- Overdue status requires external job; no job exists.

## Interior Lead Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Model supports required buyer/property/rooms/style/budget/SLA.
- Quote sent requires quote details.
- Accepted sets timestamp if absent.
- Completed requires completion note.

Missing / Partial:
- No customer creation route in API contract, but admin update only is exposed.
- Remote coordination note eligibility for NRI/PIO is not automatic.
- SLA overdue job is missing.

## Support Ticket Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- New tickets start open.
- Admin response moves to in_progress unless resolving.
- Resolved requires response/message.
- Escalation requires target and reason.

Missing / Partial:
- Ticket overdue state/job is missing.
- Auto-close window not implemented.
- Urgent-first sorting is not guaranteed by repository.

## KYC Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- User model has KYC statuses and embedded document statuses.
- Admin KYC route exists with permission.
- Buyer KYC required for sales closure.
- Seller KYC required for sell approval/active.

Missing / Partial:
- Document status roll-up to user `kycStatus` is not implemented.
- Required documents by user/transaction type are not modeled.
- Rejected document replacement logic missing.

## FEMA Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- FEMA status model exists.
- NRI/PIO deal closure requires compliant unless super admin.

Missing / Partial:
- FEMA checklist details are not modeled.
- FEMA warning state is not computed for admin/user responses.
- FEMA updates are generic and not limited to NRI/PIO.

## Payment Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Numeric amounts.
- Idempotency key support.
- Webhook signature verification.
- Payment state enum.
- Token paid reserves property.

Missing / Partial:
- Timing-safe signature compare can throw if lengths differ.
- Payment/deal/property updates are not transaction-backed.
- Payment status audit log is incomplete for webhooks.
- Refund/cancel handling is model-only.

## Notification Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Notification records and dispatch helper.
- OTP and bulk message enqueue.

Missing / Partial:
- Lifecycle notifications for enquiries, visits, sell requests, offers, payments, KYC, and support are incomplete.
- No retry job.
- Marketing opt-in/unsubscribe is missing.

## Audit Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Generic admin service updates/transitions/deletes write audit logs.

Missing / Partial:
- Admin login/logout audit missing.
- Permission changes are not exposed/audited.
- Inline admin routes do not consistently audit.
- Payment webhook audit missing.
- Audit immutability not enforced.

## Role And Permission Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Permission constants and role map exist.
- Admin routes check permissions.
- Permission denial returns 403.

Missing / Partial:
- Financial/closure actions use broad write permissions.
- `properties.publish` is not used.
- Exact final matrix remains an open source decision.

## Reporting Rules
Status: PARTIALLY IMPLEMENTED

Implemented:
- Overview and summary compute metrics from source collections.
- Date filters exist for summary.
- Export route is permission-controlled and returns expiry.

Missing / Partial:
- Visit conversion rate and stage aging are not calculated.
- Export file generation/storage is not implemented.
- Reports module is inline, not dedicated.
