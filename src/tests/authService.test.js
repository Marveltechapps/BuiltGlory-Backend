import { jest } from "@jest/globals";
import { Notification } from "../modules/notifications/model.js";
import { sendCustomerOtp } from "../modules/auth/service.js";

const originalCreate = Notification.create;
const originalFetch = global.fetch;

afterEach(() => {
  Notification.create = originalCreate;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("auth service OTP flow", () => {
  test("sends OTP request metadata and enqueues SMS", async () => {
    Notification.create = jest.fn(async (doc) => doc);
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => JSON.stringify({ status: "success" }) }));
    const result = await sendCustomerOtp({ countryCode: "+91", phone: "9000000001", deviceId: "device-1", ip: "127.0.0.1" });
    expect(result.requestId).toMatch(/^otp_req_/);
    expect(result.expiresInSeconds).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("to_mobileno=9000000001"));
    const smsUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(smsUrl.searchParams.get("sms_text")).toMatch(/\b\d{6}\b/);
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ event: "otp_sent", channel: "sms" }));
  });

  test("enforces OTP resend cooldown", async () => {
    Notification.create = jest.fn(async (doc) => doc);
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => JSON.stringify({ status: "success" }) }));
    await sendCustomerOtp({ countryCode: "+91", phone: "9000000002", deviceId: "device-2", ip: "127.0.0.1" });
    await expect(sendCustomerOtp({ countryCode: "+91", phone: "9000000002", deviceId: "device-2", ip: "127.0.0.1" })).rejects.toThrow("OTP resend cooldown");
  });
});
