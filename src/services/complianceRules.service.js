import { domainError } from "../shared/errors/AppError.js";

export const REQUIRED_KYC_MATRIX = {
  resident: ["pan", "aadhaar"],
  nri: ["passport", "visa", "overseas_address_proof", "pan"],
  pio: ["pio_card", "passport", "overseas_address_proof", "pan"]
};

export const REQUIRED_FEMA_MATRIX = {
  nri: ["fema_declaration", "source_of_funds", "nre_nro_account_proof"],
  pio: ["fema_declaration", "source_of_funds", "pio_oci_proof"]
};

const verifiedTypes = (documents = []) => new Set(documents.filter((doc) => doc.status === "verified").map((doc) => doc.type || doc.documentType));

export const missingKycDocuments = (user) => {
  const required = REQUIRED_KYC_MATRIX[user.userType] || REQUIRED_KYC_MATRIX.resident;
  const verified = verifiedTypes(user.kycDocuments || []);
  return required.filter((type) => !verified.has(type));
};

export const assertKycComplete = (user, action = "this action") => {
  const missing = missingKycDocuments(user);
  if (missing.length || user.kycStatus !== "verified") {
    throw domainError(`KYC must be verified before ${action}.`, missing.map((field) => ({ field, message: "Required KYC document is not verified." })));
  }
};

export const assertFemaComplete = (user, documents = [], action = "this action", actor) => {
  if (!["nri", "pio"].includes(user.userType)) return;
  if (user.femaCompliance?.status === "compliant") return;
  if (actor?.role === "super_admin" && actor?.overrideReason) return;
  const required = REQUIRED_FEMA_MATRIX[user.userType] || [];
  const verified = verifiedTypes(documents);
  const missing = required.filter((type) => !verified.has(type));
  throw domainError(`FEMA compliance is required before ${action}.`, missing.map((field) => ({ field, message: "Required FEMA document is not verified." })));
};
