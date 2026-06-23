# Postman API Coverage

Generated from mounted Express routes in `src/routes.js` and `src/modules/**/route.js`.

## Summary

- Total APIs Found: 104
- APIs Added To Collection: 104
- Missing APIs: 0
- Duplicate APIs: 0
- Extra Non-Mounted APIs: 0
- Coverage %: 100.00%

## Missing APIs

None.

## Duplicate APIs

None.

## Extra Non-Mounted APIs

None.

## Swagger Cross-Check Notes

Swagger files were checked as supporting documentation. Several module Swagger files still contain generic CRUD paths such as `/users`, `/properties`, and `/auditLogs/{id}` that are not mounted by Express routes. Those stale Swagger-only paths were excluded to satisfy the requirement to avoid mock APIs.

## Covered APIs

| Method | Path | Module |
| --- | --- | --- |
| DELETE | `/properties/:propertyId/save` | properties |
| GET | `/admin/acquisitions` | acquisitions |
| GET | `/admin/acquisitions/:acquisitionId` | acquisitions |
| GET | `/admin/audit-logs` | auditLogs |
| GET | `/admin/buy-enquiries` | buyEnquiries |
| GET | `/admin/buy-enquiries/:enquiryId` | buyEnquiries |
| GET | `/admin/callbacks` | callbacks |
| GET | `/admin/callbacks/:callbackId` | callbacks |
| GET | `/admin/designers` | admins |
| GET | `/admin/documents` | documents |
| GET | `/admin/interior/leads` | interiorLeads |
| GET | `/admin/interior/leads/:leadId` | interiorLeads |
| GET | `/admin/message-templates` | admins |
| GET | `/admin/negotiations/chats` | chatThreads |
| GET | `/admin/negotiations/chats/:threadId` | chatThreads |
| GET | `/admin/notifications` | notifications |
| GET | `/admin/overview` | reports |
| GET | `/admin/properties` | properties |
| GET | `/admin/properties/:propertyId` | properties |
| GET | `/admin/reports/summary` | reports |
| GET | `/admin/sales-team` | admins |
| GET | `/admin/sales/deals` | salesDeals |
| GET | `/admin/sales/deals/:dealId` | salesDeals |
| GET | `/admin/sell-requests` | sellRequests |
| GET | `/admin/sell-requests/:sellRequestId` | sellRequests |
| GET | `/admin/support/tickets` | supportTickets |
| GET | `/admin/support/tickets/:ticketId` | supportTickets |
| GET | `/admin/users` | users |
| GET | `/admin/users/:userId` | users |
| GET | `/admin/visits` | visits |
| GET | `/admin/visits/:visitId` | visits |
| GET | `/documents/:documentId/read-url` | documents |
| GET | `/me` | users |
| GET | `/me/buy-enquiries` | buyEnquiries |
| GET | `/me/buy-enquiries/:enquiryId` | buyEnquiries |
| GET | `/me/favorites` | properties |
| GET | `/me/notifications` | notifications |
| GET | `/me/payments` | payments |
| GET | `/me/sell-requests` | sellRequests |
| GET | `/me/support/tickets` | supportTickets |
| GET | `/properties` | properties |
| GET | `/properties/:propertyId` | properties |
| PATCH | `/admin/acquisitions/:acquisitionId/documentation` | acquisitions |
| PATCH | `/admin/acquisitions/:acquisitionId/negotiation` | acquisitions |
| PATCH | `/admin/acquisitions/:acquisitionId/payout` | acquisitions |
| PATCH | `/admin/acquisitions/:acquisitionId/stage` | acquisitions |
| PATCH | `/admin/acquisitions/:acquisitionId/token` | acquisitions |
| PATCH | `/admin/acquisitions/:acquisitionId/valuation` | acquisitions |
| PATCH | `/admin/buy-enquiries/:enquiryId` | buyEnquiries |
| PATCH | `/admin/callbacks/:callbackId/reschedule` | callbacks |
| PATCH | `/admin/callbacks/:callbackId/resolve` | callbacks |
| PATCH | `/admin/interior/leads/:leadId` | interiorLeads |
| PATCH | `/admin/negotiations/chats/:threadId/offers/:messageId` | chatThreads |
| PATCH | `/admin/notifications/:id` | notifications |
| PATCH | `/admin/properties/:propertyId` | properties |
| PATCH | `/admin/properties/:propertyId/status` | properties |
| PATCH | `/admin/sales/deals/:dealId/close` | salesDeals |
| PATCH | `/admin/sales/deals/:dealId/lost` | salesDeals |
| PATCH | `/admin/sales/deals/:dealId/offer` | salesDeals |
| PATCH | `/admin/sales/deals/:dealId/payment-plan` | salesDeals |
| PATCH | `/admin/sales/deals/:dealId/stage` | salesDeals |
| PATCH | `/admin/sales/deals/:dealId/token-payment` | salesDeals |
| PATCH | `/admin/sell-requests/:sellRequestId/review` | sellRequests |
| PATCH | `/admin/support/tickets/:ticketId` | supportTickets |
| PATCH | `/admin/users/:userId/assign` | users |
| PATCH | `/admin/users/:userId/block` | users |
| PATCH | `/admin/users/:userId/fema` | users |
| PATCH | `/admin/users/:userId/kyc` | users |
| PATCH | `/admin/visits/:visitId/status` | visits |
| PATCH | `/me` | users |
| PATCH | `/me/buy-enquiries/:enquiryId/cancel` | buyEnquiries |
| PATCH | `/me/sell-requests/:sellRequestId` | sellRequests |
| PATCH | `/visits/:visitId/cancel` | visits |
| PATCH | `/visits/:visitId/reschedule` | visits |
| POST | `/admin/acquisitions/:acquisitionId/convert-to-property` | acquisitions |
| POST | `/admin/bulk-messages` | admins |
| POST | `/admin/buy-enquiries/:enquiryId/convert-to-deal` | buyEnquiries |
| POST | `/admin/callbacks/:callbackId/attempts` | callbacks |
| POST | `/admin/negotiations/chats/:threadId/messages` | chatThreads |
| POST | `/admin/properties` | properties |
| POST | `/admin/properties/:propertyId/media` | properties |
| POST | `/admin/properties/bulk-upload` | properties |
| POST | `/admin/reports/export` | reports |
| POST | `/admin/sell-requests/:sellRequestId/create-acquisition` | sellRequests |
| POST | `/admin/support/tickets/:ticketId/responses` | supportTickets |
| POST | `/admin/visits/:visitId/call-logs` | visits |
| POST | `/admin/visits/:visitId/feedback` | visits |
| POST | `/auth/admin/login` | auth |
| POST | `/auth/customer/otp/send` | auth |
| POST | `/auth/customer/otp/verify` | auth |
| POST | `/auth/logout` | auth |
| POST | `/auth/refresh` | auth |
| POST | `/buy-enquiries` | buyEnquiries |
| POST | `/callbacks` | callbacks |
| POST | `/documents` | documents |
| POST | `/documents/upload-intents` | documents |
| POST | `/me/sell-requests/:sellRequestId/submit` | sellRequests |
| POST | `/payments/token` | payments |
| POST | `/payments/webhook` | payments |
| POST | `/properties/:propertyId/save` | properties |
| POST | `/sell-requests` | sellRequests |
| POST | `/sell-requests/drafts` | sellRequests |
| POST | `/support/tickets` | supportTickets |
| POST | `/visits` | visits |
