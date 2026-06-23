export const PERMISSIONS = [
  "properties.read", "properties.write", "properties.publish",
  "users.read", "users.kyc.review", "users.fema.review",
  "enquiries.read", "enquiries.write",
  "acquisitions.read", "acquisitions.write",
  "sales.read", "sales.write",
  "support.read", "support.write",
  "admin.access.manage", "audit.read"
];

export const ROLE_PERMISSIONS = {
  super_admin: PERMISSIONS,
  admin: PERMISSIONS.filter((p) => p !== "admin.access.manage"),
  operations: ["properties.read", "properties.write", "enquiries.read", "enquiries.write", "acquisitions.read", "acquisitions.write", "support.read", "support.write"],
  support: ["users.read", "support.read", "support.write"],
  sales_manager: ["properties.read", "enquiries.read", "enquiries.write", "sales.read", "sales.write", "visits.read", "visits.write"].filter(Boolean),
  sales_executive: ["properties.read", "enquiries.read", "enquiries.write", "sales.read", "sales.write"],
  relationship_manager: ["users.read", "users.kyc.review", "users.fema.review", "support.read", "support.write", "sales.read"],
  designer: ["support.read", "support.write"]
};