# KYC And FEMA Rules

## Required KYC Matrix

| User Type | Required Documents |
| --- | --- |
| resident | `pan`, `aadhaar` |
| nri | `passport`, `visa`, `overseas_address_proof`, `pan` |
| pio | `pio_card`, `passport`, `overseas_address_proof`, `pan` |

## Required FEMA Matrix

| User Type | Required Documents |
| --- | --- |
| nri | `fema_declaration`, `source_of_funds`, `nre_nro_account_proof` |
| pio | `fema_declaration`, `source_of_funds`, `pio_oci_proof` |

## Enforcement Points
- KYC verification: `src/modules/users/service.js`.
- Deal closure: `src/modules/salesDeals/service.js`.
- Shared rule engine: `src/services/complianceRules.service.js`.

## Rules
- KYC cannot become `verified` until the user type's required documents are verified.
- Buyer KYC is required before deal closure.
- Seller KYC is required before sell request approval or activation.
- NRI/PIO deal closure requires FEMA compliance unless a super admin override is explicitly provided and audited.
- FEMA does not apply to resident users.
