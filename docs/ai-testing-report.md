# AI Testing Report

## Test Method
AI QA scenarios were simulated against the generated backend by reviewing routes, validators, services, workflows, middleware, and Postman request definitions. Runtime smoke tests were executed with `npm test`; full live end-to-end execution requires seeded MongoDB data and configured Redis/S3/Razorpay/notification providers.

## Personas
- Buyer User
- Seller User
- NRI User
- PIO User
- Admin
- Sales Manager
- Support User

## Scenarios

### Customer Registration
Steps:
1. Send OTP using `POST /auth/customer/otp/send`.
2. Verify OTP using `POST /auth/customer/otp/verify`.
3. Confirm customer user is created/upserted.

Expected Result:
Customer receives JWT access/refresh tokens and a user profile.

Actual Result:
Code path exists and OTP state is Redis-backed. Real SMS provider must be configured.

Pass/Fail: PASS WITH PROVIDER CONFIGURATION

### OTP Login
Steps:
1. Send OTP.
2. Retry wrong OTP until lockout.
3. Verify with correct OTP before expiry.

Expected Result:
Expiry, retry limit, cooldown, and session issue are enforced.

Actual Result:
Expiry, retry limit, cooldown, and token issue are implemented. Test coverage is basic only.

Pass/Fail: PASS

### Profile Update
Steps:
1. Authenticate as customer.
2. PATCH `/me` with name/email/city/state/country/userType/role.
3. Validate response envelope.

Expected Result:
Only allowed profile fields update.

Actual Result:
Validator now restricts profile fields and service updates the logged-in user.

Pass/Fail: PASS

### Browse Properties
Steps:
1. GET `/properties` with city, price, area, bhk, featured/upcoming, sort, page, limit.
2. GET `/properties/:propertyId`.

Expected Result:
Only public non-deleted properties appear with pagination.

Actual Result:
Public status filtering and mapped filters exist. Detail recommendations/documents are not fully aggregated.

Pass/Fail: PARTIAL

### Save Property
Steps:
1. POST `/properties/:propertyId/save`.
2. GET `/me/favorites`.
3. DELETE `/properties/:propertyId/save`.

Expected Result:
Favorites update idempotently and saved count does not over-increment.

Actual Result:
Idempotent save/remove is implemented.

Pass/Fail: PASS

### Create Enquiry
Steps:
1. Authenticate as buyer.
2. POST `/buy-enquiries`.
3. Submit duplicate enquiry for same property.

Expected Result:
Visible property is required and duplicate is flagged.

Actual Result:
Visible property, email contact, blocked user, schedule preference, and duplicate flag logic exist.

Pass/Fail: PASS

### Schedule Visit
Steps:
1. POST `/visits` with future date/time.
2. PATCH reschedule.
3. PATCH cancel.

Expected Result:
Future date is required; reschedule history and cancel reason are stored.

Actual Result:
Implemented. Admin feedback next-action side effects are still partial.

Pass/Fail: PARTIAL

### Create Sell Request
Steps:
1. Authenticate as seller/both.
2. Save draft.
3. Submit full sell request with price, address, pincode, ownership, photos.

Expected Result:
Draft permits partial data; submission enforces required listing fields.

Actual Result:
Implemented. Ownership/legal document approval check remains partial.

Pass/Fail: PARTIAL

### Upload Documents
Steps:
1. Request upload intent.
2. Upload multipart document.
3. Check document metadata and scan status.

Expected Result:
File type/size enforced, metadata stored, private defaults for sensitive docs.

Actual Result:
Implemented with S3 boundary and scan status. Real malware scanner/job missing.

Pass/Fail: PARTIAL

### Approve Sell Request
Steps:
1. Admin PATCH review decision to approved.
2. Verify seller KYC is checked.

Expected Result:
Seller KYC must be verified before approval/activation.

Actual Result:
KYC gate exists. Legal document approval is partial.

Pass/Fail: PARTIAL

### Create Acquisition
Steps:
1. Admin creates acquisition from approved sell request.
2. Verify one active acquisition per sell request.

Expected Result:
Acquisition derives seller/property snapshots and rejects duplicates.

Actual Result:
Implemented.

Pass/Fail: PASS

### Convert Acquisition To Property
Steps:
1. Move acquisition to acquired.
2. POST convert to property.

Expected Result:
Only acquired assets convert to draft property with `source = acquired`.

Actual Result:
Implemented. Multi-document transaction not implemented.

Pass/Fail: PARTIAL

### Create Sales Deal
Steps:
1. Convert buy enquiry to sales deal.
2. Verify unsold property and one active deal per enquiry.

Expected Result:
Deal is created with buyer/property snapshots and source enquiry.

Actual Result:
Implemented.

Pass/Fail: PASS

### Token Payment
Steps:
1. POST `/payments/token`.
2. Process webhook.
3. Verify payment/deal/property state.

Expected Result:
Gateway order is created, webhook is signature-verified, paid token reserves property.

Actual Result:
Implemented with Razorpay boundary. Requires provider credentials; transaction/replay protection partial.

Pass/Fail: PARTIAL

### Close Deal
Steps:
1. Ensure buyer KYC verified.
2. Ensure NRI/PIO FEMA compliant.
3. Close deal.

Expected Result:
Deal closes, property sold, enquiry closed.

Actual Result:
Service enforces KYC/FEMA/payment and side effects. Transaction missing.

Pass/Fail: PARTIAL

### Support Ticket
Steps:
1. Customer creates ticket.
2. Admin responds.
3. Admin resolves.

Expected Result:
Ticket starts open, first response moves in_progress, resolution requires response.

Actual Result:
Implemented. Auto-close/overdue jobs missing.

Pass/Fail: PARTIAL

### Callback Request
Steps:
1. Customer creates callback.
2. Admin adds attempt.
3. Admin resolves or reschedules.

Expected Result:
SLA set, attempts counted, reschedule and resolve validations enforced.

Actual Result:
Implemented. Overdue job and wrong-number contact flag missing.

Pass/Fail: PARTIAL

## Summary
- Passed by code/static validation: OTP login, profile update, favorites, enquiry creation, acquisition creation, sales deal creation.
- Partial due to provider/config/transaction/job/detail aggregation gaps: properties, visits, sell requests, uploads, approvals, acquisition conversion, payments, deal closure, support, callbacks.
- Failed: none at route-existence level.
