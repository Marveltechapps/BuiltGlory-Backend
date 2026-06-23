# BuiltGlory API Contract

## Purpose

This document defines the target REST API contract between the BuiltGlory customer app, the managerial dashboard, and the Node.js/Express.js backend backed by MongoDB.

The current workspace contains frontend prototypes and dashboard mock data, but no backend implementation. Endpoint names and payloads below are therefore derived from:

- Customer app screens in `BuiltGlory-App/src/screens/`
- Customer sample data in `BuiltGlory-App/src/data/data.ts`
- Dashboard routes in `builtglory-frontend-1.1/src/routes/adminRoutes.tsx`
- Dashboard mock models in `builtglory-frontend-1.1/src/mock/`
- Existing API hints such as `GET /properties`, `GET /users`, `GET /sales/deals`, and `GET /acquisitions`

## Contract Status Labels

- Current mock-derived: the shape exists today as TypeScript mock data.
- Frontend TODO hint: the frontend includes a TODO comment for this endpoint.
- Target proposed: needed for production, but not implemented in this repo.

## API Standards

Base URL:

```text
https://api.builtglory.com/api/v1
```

Local development:

```text
http://localhost:3000/api/v1
```

Transport:

- Protocol: HTTPS in production.
- Format: JSON for request and response bodies.
- Time zone: store timestamps in UTC ISO 8601.
- Currency: store all money values as integer paise or integer INR minor-unit strategy agreed by finance. For current docs, examples use integer INR values to match existing mocks.
- IDs: MongoDB `_id` internally, public `referenceId` externally for support and operations.
- File uploads: multipart upload to backend, backend stores objects in S3-compatible storage and saves metadata URLs in MongoDB.

## Authentication

### Customer Authentication

Target proposed.

The customer app uses phone OTP login in the prototype. Production should use OTP issue and verification APIs.

#### POST `/auth/customer/otp/send`

Sends a 6-digit OTP to a phone number.

Request:

```json
{
  "countryCode": "+91",
  "phone": "9876543210"
}
```

Validation:

- `phone` must contain exactly 10 digits for India.
- Rate-limit by phone, IP, and device.
- Do not reveal whether the phone is already registered.

Response `200`:

```json
{
  "requestId": "otp_req_123",
  "expiresInSeconds": 60,
  "canResendAt": "2026-06-20T10:31:00.000Z"
}
```

#### POST `/auth/customer/otp/verify`

Verifies OTP and returns a customer session.

Request:

```json
{
  "requestId": "otp_req_123",
  "phone": "9876543210",
  "otp": "123456"
}
```

Response `200`:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "usr_001",
    "referenceId": "USER-001",
    "name": "Arjun Mehta",
    "phone": "+91 98765 43210",
    "role": "buyer",
    "userType": "resident",
    "profileComplete": true
  }
}
```

### Admin Authentication

Target proposed.

The dashboard currently uses hardcoded credentials and `localStorage`. Production must use backend-issued tokens and role-based access control.

#### POST `/auth/admin/login`

Request:

```json
{
  "email": "admin@builtglory.com",
  "password": "secret"
}
```

Response `200`:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "admin": {
    "id": "adm_001",
    "name": "Arjun Kapoor",
    "email": "admin@builtglory.com",
    "role": "super_admin",
    "permissions": ["properties.read", "properties.write", "users.kyc.review"]
  },
  "expiresInSeconds": 1800
}
```

#### POST `/auth/refresh`

Returns a new access token using a valid refresh token.

#### POST `/auth/logout`

Revokes the refresh token and closes the session.

## Common Response Shapes

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

Paginated success:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 248,
    "totalPages": 13,
    "requestId": "req_123"
  }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      {
        "field": "phone",
        "message": "Phone must contain 10 digits."
      }
    ]
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Common status codes:

- `200`: request succeeded.
- `201`: resource created.
- `204`: resource deleted or no response body.
- `400`: validation failed.
- `401`: missing or invalid authentication.
- `403`: authenticated but not authorized.
- `404`: resource not found.
- `409`: duplicate or invalid state transition.
- `422`: domain rule violation.
- `429`: rate limit exceeded.
- `500`: unexpected server error.

## Customer App APIs

### Profile

#### GET `/me`

Returns the logged-in customer profile.

#### PATCH `/me`

Updates name, email, city, state, country, profile photo, user type, and buyer/seller role.

Request:

```json
{
  "name": "Arjun Mehta",
  "email": "arjun@example.com",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "userType": "resident",
  "role": "both"
}
```

### Properties

Frontend TODO hint: `GET /properties`.

#### GET `/properties`

Lists public, active properties for the customer app.

Query parameters:

- `type`: `plot`, `apartment`, `villa`, `commercial`, `land`, `fractional`, `3d_printing`, `organic_home`, `ceo_mansion`, `holiday_home`, `farmhouse`, `nri`, `interior`
- `city`
- `locality`
- `minPrice`
- `maxPrice`
- `minArea`
- `maxArea`
- `bhk`
- `verified`
- `featured`
- `upcoming`
- `sort`: `relevance`, `price_asc`, `price_desc`, `newest`
- `page`
- `limit`

Response item:

```json
{
  "id": "prop_001",
  "referenceId": "PROP-001",
  "title": "Luxury Apartment, Indiranagar",
  "description": "Verified apartment with legal checks.",
  "type": "apartment",
  "status": "available",
  "isFeatured": true,
  "isUpcoming": false,
  "address": "Indiranagar, Bangalore",
  "locality": "Indiranagar",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560038",
  "latitude": 12.9716,
  "longitude": 77.6412,
  "price": 4500000,
  "isNegotiable": true,
  "specs": {
    "bhk": "3 BHK",
    "builtUpArea": 1450,
    "floor": "4",
    "totalFloors": 8,
    "facing": "East",
    "reraNumber": "K-RERA-PRJ-00001"
  },
  "amenities": ["Lift", "Parking", "Security"],
  "photos": ["https://cdn.example.com/properties/prop_001/1.jpg"],
  "coverPhoto": "https://cdn.example.com/properties/prop_001/cover.jpg",
  "videoUrl": null,
  "tour3dUrl": null,
  "floorPlanUrl": null,
  "savedCount": 36,
  "views": 1284,
  "enquiries": 36,
  "visits": 7,
  "launchDate": null,
  "advantages": {
    "investment": ["High rental demand"],
    "location": ["Near metro"],
    "connectivity": ["Outer Ring Road access"]
  },
  "nearbyPlaces": [
    {
      "name": "Indiranagar Metro",
      "type": "metro",
      "distance": "1.2 km"
    }
  ],
  "highlights": ["Verified", "Ready to move"],
  "createdAt": "2026-05-29T10:00:00.000Z",
  "updatedAt": "2026-05-29T10:00:00.000Z"
}
```

#### GET `/properties/:propertyId`

Returns full property details, media, documents allowed for the viewer, and related recommendations.

#### POST `/properties/:propertyId/save`

Saves a property to the customer's favorites.

#### DELETE `/properties/:propertyId/save`

Removes a property from favorites.

#### GET `/me/favorites`

Returns saved properties.

### Buy Enquiries

Frontend TODO hint: `GET /enquiries?type=buy`.

#### POST `/buy-enquiries`

Creates a buyer enquiry from the customer app.

Request:

```json
{
  "propertyId": "prop_001",
  "enquiryTypes": ["Schedule Visit"],
  "preferredContact": "whatsapp",
  "interestType": "schedule_visit",
  "preferredVisitTime": "tomorrow_morning",
  "preferredVisitDate": null,
  "preferredVisitTimeSlot": "10:00 AM - 12:00 PM",
  "additionalMessage": "Looking for 3BHK with good ventilation"
}
```

Response `201`:

```json
{
  "data": {
    "id": "enq_001",
    "referenceId": "BG-ENQ-2026-001",
    "status": "new",
    "assignedTo": "SP-003",
    "submittedAt": "2026-05-29T10:30:00.000Z"
  }
}
```

#### GET `/me/buy-enquiries`

Lists the logged-in customer's buy enquiries.

#### GET `/me/buy-enquiries/:enquiryId`

Returns one enquiry and related visits, chats, and deal status.

#### PATCH `/me/buy-enquiries/:enquiryId/cancel`

Cancels a buyer enquiry when no active deal has started.

### Visits

Frontend TODO hint: `GET /visits`.

#### POST `/visits`

Schedules a physical or virtual visit.

Request:

```json
{
  "propertyId": "prop_001",
  "enquiryId": "enq_001",
  "visitDate": "2026-05-30",
  "visitTime": "10:00 AM",
  "visitType": "physical"
}
```

#### PATCH `/visits/:visitId/reschedule`

Reschedules an existing visit and appends to reschedule history.

#### PATCH `/visits/:visitId/cancel`

Cancels a visit with a reason.

### Sell Requests

Frontend TODO hint: `GET /listings?status=pending`.

#### POST `/sell-requests`

Creates a seller listing request.

Request:

```json
{
  "propertyType": "apartment",
  "propertyTitle": "Bright 3 BHK in Adyar",
  "askingPrice": 8500000,
  "negotiable": true,
  "address": {
    "street": "Sunrise Heights",
    "locality": "Adyar",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600020",
    "landmark": "Near metro"
  },
  "specifications": {
    "bhk": "3 BHK",
    "builtUpArea": "1450",
    "floor": "7",
    "age": "1-5 years"
  },
  "amenities": ["Lift", "Parking", "Power Backup"],
  "ownershipType": "Freehold",
  "possessionStatus": "Immediate",
  "loanOnProperty": false,
  "description": "Ready to move apartment.",
  "photos": ["file_001"],
  "documents": ["doc_001"]
}
```

Response `201`:

```json
{
  "data": {
    "id": "sell_001",
    "referenceId": "BG-SELL-2026-001",
    "status": "new",
    "completenessPercent": 75,
    "submittedAt": "2026-06-20T10:00:00.000Z"
  }
}
```

#### POST `/sell-requests/drafts`

Saves a draft listing with the current step number.

#### GET `/me/sell-requests`

Lists seller listings and drafts.

#### PATCH `/me/sell-requests/:sellRequestId`

Updates a draft or change-requested sell request.

#### POST `/me/sell-requests/:sellRequestId/submit`

Submits a draft for managerial review.

### Customer Payments

Target proposed.

#### POST `/payments/token`

Creates a token payment order for a sales deal.

#### POST `/payments/webhook`

Payment gateway webhook. This endpoint must be protected by gateway signature verification.

#### GET `/me/payments`

Returns customer payment history.

### Support And Callbacks

Frontend TODO hint: `GET /callbacks`.

#### POST `/callbacks`

Creates a callback request from help, profile support, property detail, payment, or interior screens.

Request:

```json
{
  "source": "help_support",
  "sourceScreen": "H-05 Help & Support",
  "category": "property_inquiry",
  "propertyId": "prop_001",
  "reason": "Need more details about pricing.",
  "preferredTime": "2026-05-30T10:00:00.000Z",
  "bestTimePreference": "morning"
}
```

#### POST `/support/tickets`

Creates a support ticket.

#### GET `/me/support/tickets`

Lists customer support tickets.

## Managerial Dashboard APIs

All dashboard APIs require an admin token and permission checks.

### Dashboard Overview

#### GET `/admin/overview`

Returns KPI cards, schedule, recent activities, and pipeline counts.

### Admin Properties

Frontend TODO hint: `GET /properties`.

#### GET `/admin/properties`

Lists all properties including drafts, upcoming, deleted, acquired, manually added, and bulk-uploaded records.

Query parameters:

- `status`: `available`, `sold`, `reserved`, `under_construction`, `draft`
- `type`
- `source`: `acquired`, `manual`, `bulk_upload`
- `featured`
- `upcoming`
- `assignedTo`
- `search`
- `page`
- `limit`

#### POST `/admin/properties`

Creates a property manually.

#### GET `/admin/properties/:propertyId`

Returns one property, operational metrics, acquisition source, and activity history.

#### PATCH `/admin/properties/:propertyId`

Updates property details.

#### POST `/admin/properties/:propertyId/media`

Uploads photos, videos, drone images, floor plans, or 3D tour links.

#### PATCH `/admin/properties/:propertyId/status`

Changes property status.

Request:

```json
{
  "status": "reserved",
  "reason": "Token payment received",
  "effectiveAt": "2026-06-20T10:00:00.000Z"
}
```

#### POST `/admin/properties/bulk-upload`

Uploads a CSV/XLSX file and returns validation results before import.

### Admin Users And KYC

Frontend TODO hint: `GET /users`.

#### GET `/admin/users`

Lists users with KYC, FEMA, role, active/blocked, and assignment filters.

#### GET `/admin/users/:userId`

Returns full user profile, KYC documents, enquiries, visits, deals, listings, tickets, and audit history.

#### PATCH `/admin/users/:userId/block`

Blocks or unblocks a user.

#### PATCH `/admin/users/:userId/assign`

Assigns a relationship manager.

#### PATCH `/admin/users/:userId/kyc`

Approves or rejects KYC.

Request:

```json
{
  "status": "verified",
  "documentUpdates": [
    {
      "documentId": "doc_001",
      "status": "verified",
      "rejectionReason": null
    }
  ],
  "notes": "PAN and Aadhaar verified."
}
```

#### PATCH `/admin/users/:userId/fema`

Updates FEMA compliance for NRI/PIO users.

### Admin Buy Enquiries

Frontend TODO hint: `GET /enquiries?type=buy`.

#### GET `/admin/buy-enquiries`

Lists buyer enquiries.

#### GET `/admin/buy-enquiries/:enquiryId`

Returns an enquiry, duplicate warning, stale visit preference warning, and related user/property context.

#### PATCH `/admin/buy-enquiries/:enquiryId`

Updates status, assignment, contact preference, and notes.

#### POST `/admin/buy-enquiries/:enquiryId/convert-to-deal`

Creates a sales deal from a qualified enquiry.

### Admin Sell Requests

Frontend TODO hint: `GET /listings?status=pending`.

#### GET `/admin/sell-requests`

Lists sell requests by status, completeness, city, assignee, and seller KYC.

#### GET `/admin/sell-requests/:sellRequestId`

Returns seller listing details, photos, documents, similar properties, and review history.

#### PATCH `/admin/sell-requests/:sellRequestId/review`

Approves, rejects, accepts, or requests changes.

Request:

```json
{
  "decision": "approved",
  "notes": "Documents and minimum listing details verified.",
  "changeRequests": []
}
```

#### POST `/admin/sell-requests/:sellRequestId/create-acquisition`

Creates an acquisition pipeline item from a sell request.

### Acquisition Pipeline

Frontend TODO hint: `GET /acquisitions`.

#### GET `/admin/acquisitions`

Lists acquisition pipeline records.

Query parameters:

- `stage`
- `priority`
- `assignedTo`
- `city`
- `createdFrom`
- `search`
- `page`
- `limit`

#### GET `/admin/acquisitions/:acquisitionId`

Returns acquisition details, stage data, seller data, property documents, media, and activity history.

#### PATCH `/admin/acquisitions/:acquisitionId/stage`

Moves acquisition to another stage.

Request:

```json
{
  "stage": "valuation",
  "notes": "Inspection completed and valuation started."
}
```

#### PATCH `/admin/acquisitions/:acquisitionId/valuation`

Saves BuiltGlory offer and valuation notes.

#### PATCH `/admin/acquisitions/:acquisitionId/negotiation`

Saves agreed seller price or marks negotiation failed.

#### PATCH `/admin/acquisitions/:acquisitionId/token`

Records token payment to seller.

#### PATCH `/admin/acquisitions/:acquisitionId/documentation`

Updates legal checklist and document verification status.

#### PATCH `/admin/acquisitions/:acquisitionId/payout`

Records seller payout details.

#### POST `/admin/acquisitions/:acquisitionId/convert-to-property`

Creates a property listing from an acquired asset.

### Sales Pipeline

Frontend TODO hint: `GET /sales/deals`.

#### GET `/admin/sales/deals`

Lists sales deals by stage, priority, assignee, buyer type, property, and payment state.

#### GET `/admin/sales/deals/:dealId`

Returns sales deal details, buyer, property, payment, visit, negotiation, documentation, and interior context.

#### PATCH `/admin/sales/deals/:dealId/stage`

Moves a deal through the sales lifecycle.

#### PATCH `/admin/sales/deals/:dealId/offer`

Records buyer offer, counter offer, or agreed price.

#### PATCH `/admin/sales/deals/:dealId/token-payment`

Records token amount and token-paid status.

#### PATCH `/admin/sales/deals/:dealId/payment-plan`

Sets `paymentType` as `full` or `stage`.

#### PATCH `/admin/sales/deals/:dealId/close`

Closes a deal and marks the linked property sold.

#### PATCH `/admin/sales/deals/:dealId/lost`

Marks a deal lost with reason.

### Visits

Frontend TODO hint: `GET /visits`.

#### GET `/admin/visits`

Lists visits.

#### GET `/admin/visits/:visitId`

Returns visit detail, buyer context, property context, call logs, notes, activities, and feedback.

#### PATCH `/admin/visits/:visitId/status`

Updates visit status.

#### POST `/admin/visits/:visitId/feedback`

Stores visit feedback and next action.

#### POST `/admin/visits/:visitId/call-logs`

Adds call log details.

### Callbacks

Frontend TODO hint: `GET /callbacks`.

#### GET `/admin/callbacks`

Lists callback requests and SLA state.

#### GET `/admin/callbacks/:callbackId`

Returns callback detail.

#### POST `/admin/callbacks/:callbackId/attempts`

Adds a call attempt.

#### PATCH `/admin/callbacks/:callbackId/resolve`

Resolves a callback with notes.

#### PATCH `/admin/callbacks/:callbackId/reschedule`

Reschedules a callback and recalculates SLA.

### Negotiation Chats

Frontend TODO hint: `GET /negotiations/chats`.

#### GET `/admin/negotiations/chats`

Lists negotiation chat threads.

#### GET `/admin/negotiations/chats/:threadId`

Returns chat messages and negotiation summary.

#### POST `/admin/negotiations/chats/:threadId/messages`

Sends an admin message or offer.

#### PATCH `/admin/negotiations/chats/:threadId/offers/:messageId`

Accepts, declines, or counters an offer.

### Interior Leads

Frontend TODO hint: `GET /interior/leads`.

#### GET `/admin/interior/leads`

Lists interior leads.

#### GET `/admin/interior/leads/:leadId`

Returns interior lead detail.

#### PATCH `/admin/interior/leads/:leadId`

Updates assignment, status, quote, and notes.

### Support Tickets

#### GET `/admin/support/tickets`

Lists support tickets.

#### GET `/admin/support/tickets/:ticketId`

Returns support ticket detail.

#### POST `/admin/support/tickets/:ticketId/responses`

Adds a support response.

#### PATCH `/admin/support/tickets/:ticketId`

Updates status, priority, assignee, or escalation.

### Admin Tools

#### GET `/admin/sales-team`

Frontend TODO hint: `GET /sales-team`.

Returns sales and relationship managers for assignment.

#### GET `/admin/designers`

Frontend TODO hint: `GET /designers`.

Returns interior designers for assignment.

#### GET `/admin/message-templates`

Returns message templates.

#### POST `/admin/bulk-messages`

Sends a controlled bulk message campaign.

#### GET `/admin/audit-logs`

Returns audit logs with actor, action, resource, timestamp, and diff.

## OpenAPI Implementation Guidance

The backend should generate an OpenAPI 3.1 document from route schemas.

Recommended Express implementation:

- Use `zod` or `joi` for request validation.
- Co-locate route validation schemas with controller modules.
- Generate OpenAPI from validation schemas.
- Serve Swagger UI at `/api-docs`.
- Expose raw JSON at `/openapi.json`.

Suggested backend module layout:

```text
backend/
  src/
    app.ts
    server.ts
    config/
    middleware/
    modules/
      auth/
      users/
      properties/
      enquiries/
      sellRequests/
      acquisitions/
      sales/
      visits/
      callbacks/
      chats/
      interior/
      support/
      admin/
    shared/
      db/
      errors/
      openapi/
```

## Contract Gaps To Confirm

- Payment gateway provider and webhook payloads.
- OTP provider and resend/lockout policy.
- Exact admin role-permission matrix.
- Whether money is stored as INR integer values or paise.
- Whether public IDs should use current prefixes (`PROP-001`, `BG-ENQ-2026-001`) or generated slugs.
- File storage provider, virus scanning, and retention policy.
