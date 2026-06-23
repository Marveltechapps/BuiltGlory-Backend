import { env } from "../config/env.js";
import { assertFemaComplete, assertKycComplete, missingKycDocuments } from "../services/complianceRules.service.js";
import { assertLegalVerification, assertMandatoryDocuments, missingDocuments, missingVerifiedDocuments, SELLER_DOCUMENT_CHECKLIST } from "../services/legalDocumentRules.service.js";
import { sendViaProvider } from "../services/notificationProviders.service.js";
import { createReadUrl, createUploadUrl, scanBuffer, uploadBuffer, validateUpload } from "../services/storage.service.js";

describe("rule and provider service branches", () => {
  afterEach(() => {
    delete process.env.SMS_PROVIDER_URL;
    delete process.env.SMS_PROVIDER_TOKEN;
    delete global.fetch;
    env.MALWARE_SCANNER_MODE = "disabled";
    env.AWS_S3_BUCKET = "";
    env.QUARANTINE_S3_BUCKET = "";
  });

  test("compliance rules handle resident, NRI, PIO, compliant, and override branches", () => {
    expect(missingKycDocuments({ userType: "resident", kycDocuments: [{ type: "pan", status: "verified" }] })).toEqual(["aadhaar"]);
    expect(() => assertKycComplete({ userType: "resident", kycStatus: "verified", kycDocuments: [{ type: "pan", status: "verified" }, { type: "aadhaar", status: "verified" }] }, "purchase")).not.toThrow();
    expect(() => assertKycComplete({ userType: "resident", kycStatus: "pending", kycDocuments: [] }, "purchase")).toThrow("KYC");
    expect(() => assertFemaComplete({ userType: "resident" }, [], "purchase")).not.toThrow();
    expect(() => assertFemaComplete({ userType: "nri", femaCompliance: { status: "compliant" } }, [], "purchase")).not.toThrow();
    expect(() => assertFemaComplete({ userType: "pio" }, [], "purchase", { role: "super_admin", overrideReason: "manual approval" })).not.toThrow();
    expect(() => assertFemaComplete({ userType: "nri" }, [{ type: "fema_declaration", status: "verified" }], "purchase")).toThrow("FEMA");
  });

  test("legal document rules cover missing and verified checklist branches", () => {
    const docs = [{ name: "sale_deed", status: "uploaded" }, { type: "khata_certificate", status: "verified" }];
    expect(missingDocuments(docs, SELLER_DOCUMENT_CHECKLIST)).toEqual(["property_tax_receipt", "identity_proof"]);
    expect(missingVerifiedDocuments(docs, ["sale_deed", "khata_certificate"])).toEqual(["sale_deed"]);
    expect(() => assertMandatoryDocuments({ documents: docs, checklist: SELLER_DOCUMENT_CHECKLIST, action: "approval" })).toThrow("Mandatory");
    expect(() => assertLegalVerification({ documentation: { ownership_verified: true }, action: "payout" })).toThrow("Legal verification");
    expect(() => assertLegalVerification({ documentation: { ownership_verified: true, encumbrance_clear: true, tax_clear: true, litigation_clear: true, approvals_verified: true }, action: "payout" })).not.toThrow();
  });

  test("storage validation, scanner, and S3 configuration branches", async () => {
    expect(() => validateUpload({ purpose: "property_media", mimeType: "image/webp", sizeBytes: 10 })).not.toThrow();
    expect(() => validateUpload({ purpose: "kyc", mimeType: "text/plain", sizeBytes: 10 })).toThrow("Unsupported");
    expect(() => validateUpload({ purpose: "kyc", mimeType: "application/pdf", sizeBytes: 26 * 1024 * 1024 })).toThrow("25MB");

    expect(await scanBuffer({ buffer: Buffer.from("clean") })).toMatchObject({ status: "pending" });
    env.MALWARE_SCANNER_MODE = "provider";
    expect(await scanBuffer({ buffer: Buffer.from("clean") })).toMatchObject({ status: "clean" });
    expect(await scanBuffer({ buffer: Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE") })).toMatchObject({ status: "infected" });

    await expect(uploadBuffer({ key: "a", mimeType: "application/pdf", buffer: Buffer.from("x") })).rejects.toThrow("S3 bucket");
    await expect(createUploadUrl({ key: "a", mimeType: "application/pdf" })).rejects.toThrow("S3 bucket");
    await expect(createReadUrl({ key: "a", expiresIn: 2000 })).rejects.toThrow("S3 bucket");
  });

  test("notification providers cover configured, unconfigured, in-app, and unsupported branches", async () => {
    expect(await sendViaProvider({ channel: "sms", recipient: "1", message: "Hi", payload: {} })).toMatchObject({ ok: false, status: 503 });
    process.env.SMS_PROVIDER_URL = "https://provider.example/send";
    process.env.SMS_PROVIDER_TOKEN = "token";
    global.fetch = async (url, options) => ({ ok: true, status: 202, text: async () => JSON.stringify({ url, authorization: options.headers.authorization }) });
    expect(await sendViaProvider({ channel: "sms", recipient: "1", message: "Hi", payload: { a: 1 } })).toMatchObject({ ok: true, status: 202 });
    expect(await sendViaProvider({ channel: "in_app", recipient: "1", message: "Hi", payload: {} })).toMatchObject({ ok: true, status: 200 });
    expect(sendViaProvider({ channel: "fax", recipient: "1", message: "Hi", payload: {} })).toMatchObject({ ok: false, status: 400 });
  });
});
