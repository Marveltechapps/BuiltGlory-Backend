import { assertKycComplete, missingKycDocuments } from "../services/complianceRules.service.js";
import { assertMandatoryDocuments, assertLegalVerification, SELLER_DOCUMENT_CHECKLIST } from "../services/legalDocumentRules.service.js";

describe("compliance and legal rules", () => {
  test("detects missing resident KYC documents", () => {
    const missing = missingKycDocuments({ userType: "resident", kycDocuments: [{ documentType: "pan", status: "verified" }] });
    expect(missing).toEqual(["aadhaar"]);
  });

  test("allows verified KYC matrix", () => {
    expect(() => assertKycComplete({ userType: "resident", kycStatus: "verified", kycDocuments: [{ documentType: "pan", status: "verified" }, { documentType: "aadhaar", status: "verified" }] }, "deal closure")).not.toThrow();
  });

  test("requires seller mandatory documents", () => {
    expect(() => assertMandatoryDocuments({ documents: [], checklist: SELLER_DOCUMENT_CHECKLIST, action: "approval" })).toThrow("Mandatory documents");
  });

  test("requires complete legal verification checklist", () => {
    expect(() => assertLegalVerification({ documentation: { ownership_verified: true }, action: "seller payout" })).toThrow("Legal verification");
  });
});
