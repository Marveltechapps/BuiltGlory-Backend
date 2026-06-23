# Legal Document Rules

## Property Document Checklist
- `title_deed`
- `encumbrance_certificate`
- `tax_receipt`
- `rera_certificate`

## Seller Document Checklist
- `sale_deed`
- `khata_certificate`
- `property_tax_receipt`
- `identity_proof`

## Legal Verification Checklist
- `ownership_verified`
- `encumbrance_clear`
- `tax_clear`
- `litigation_clear`
- `approvals_verified`

## Approval Workflow
1. Documents are uploaded through the document upload flow with `purpose = legal`.
2. Uploaded files remain private by default.
3. Malware scan must complete before operational approval.
4. Legal reviewer verifies each checklist item.
5. Sell request approval requires all seller mandatory documents.
6. Acquisition seller payout requires all legal verification checklist items.
7. Property publication requires public-listing fields plus clean approved media.

## Enforcement Points
- Seller approval: `src/modules/sellRequests/service.js`.
- Acquisition seller payout: `src/modules/acquisitions/service.js`.
- Shared rule engine: `src/services/legalDocumentRules.service.js`.
