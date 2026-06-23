import { domainError } from "../shared/errors/AppError.js";

export const PROPERTY_DOCUMENT_CHECKLIST = ["title_deed", "encumbrance_certificate", "tax_receipt", "rera_certificate"];
export const SELLER_DOCUMENT_CHECKLIST = ["sale_deed", "khata_certificate", "property_tax_receipt", "identity_proof"];
export const LEGAL_VERIFICATION_CHECKLIST = ["ownership_verified", "encumbrance_clear", "tax_clear", "litigation_clear", "approvals_verified"];

const uploadedTypes = (documents = []) => new Set(documents.filter((doc) => ["uploaded", "verified"].includes(doc.status)).map((doc) => doc.documentType || doc.type || doc.name));
const verifiedTypes = (documents = []) => new Set(documents.filter((doc) => doc.status === "verified").map((doc) => doc.documentType || doc.type || doc.name));

export const missingDocuments = (documents = [], checklist = []) => {
  const uploaded = uploadedTypes(documents);
  return checklist.filter((item) => !uploaded.has(item));
};

export const missingVerifiedDocuments = (documents = [], checklist = []) => {
  const verified = verifiedTypes(documents);
  return checklist.filter((item) => !verified.has(item));
};

export const assertMandatoryDocuments = ({ documents = [], checklist, action }) => {
  const missing = missingDocuments(documents, checklist);
  if (missing.length) throw domainError(`Mandatory documents are required before ${action}.`, missing.map((field) => ({ field, message: "Document is missing." })));
};

export const assertLegalVerification = ({ documentation = {}, action }) => {
  const missing = LEGAL_VERIFICATION_CHECKLIST.filter((key) => documentation[key] !== true);
  if (missing.length) throw domainError(`Legal verification checklist must be complete before ${action}.`, missing.map((field) => ({ field, message: "Checklist item is incomplete." })));
};
