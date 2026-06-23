import { renderTemplate } from "../services/notificationTemplates.service.js";
import { sendViaProvider } from "../services/notificationProviders.service.js";
import { scanBuffer, validateUpload } from "../services/storage.service.js";
import { incrementMetric, metricsSnapshot, observeMetric } from "../services/metrics.service.js";
import { withJobLock } from "../services/jobLock.service.js";

describe("notification, storage, metrics, and job helpers", () => {
  test("renders notification templates", () => {
    expect(renderTemplate({ templateId: "visit_reminder", channel: "sms", payload: { visitDate: "tomorrow" } })).toContain("tomorrow");
  });

  test("in-app provider succeeds without external credentials", async () => {
    await expect(sendViaProvider({ channel: "in_app", recipient: "user", message: "hello", payload: {} })).resolves.toMatchObject({ ok: true, status: 200 });
  });

  test("unsupported provider fails closed", async () => {
    expect(await sendViaProvider({ channel: "fax", recipient: "user", message: "hello", payload: {} })).toMatchObject({ ok: false, status: 400 });
  });

  test("validates upload type and size", () => {
    expect(() => validateUpload({ purpose: "kyc", mimeType: "application/pdf", sizeBytes: 1024 })).not.toThrow();
    expect(() => validateUpload({ purpose: "kyc", mimeType: "application/x-msdownload", sizeBytes: 1024 })).toThrow("Unsupported file type");
    expect(() => validateUpload({ purpose: "kyc", mimeType: "application/pdf", sizeBytes: 30 * 1024 * 1024 })).toThrow("File size exceeds");
  });

  test("detects disabled malware scanner as pending", async () => {
    await expect(scanBuffer({ buffer: Buffer.from("clean") })).resolves.toMatchObject({ status: "pending" });
  });

  test("records metrics counters and observations", () => {
    incrementMetric("test_counter", { route: "unit" });
    observeMetric("test_duration", 12, { route: "unit" });
    const snapshot = metricsSnapshot();
    expect(JSON.stringify(snapshot.counters)).toContain("test_counter");
    expect(JSON.stringify(snapshot.histograms)).toContain("test_duration");
  });

  test("runs a lock-protected job", async () => {
    await expect(withJobLock("unit", async () => ({ ok: true }))).resolves.toEqual({ ok: true });
  });
});
