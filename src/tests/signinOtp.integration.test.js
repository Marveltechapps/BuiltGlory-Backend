import { jest } from "@jest/globals";
import request from "supertest";
import { app, setupIntegrationDb } from "./helpers/integrationHarness.js";
import { User } from "../modules/users/model.js";

jest.setTimeout(60_000);

setupIntegrationDb();

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("signin OTP workflow", () => {
  test("sends and verifies OTP for a mobile number", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ status: "success" })
    }));

    const send = await request(app).post("/api/signin/send-otp").send({ mobileNumber: "9876543210" });
    expect(send.status).toBe(200);
    expect(send.body.message).toBe("OTP sent successfully");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("to_mobileno=9876543210"));

    const userWithOtp = await User.findOne({ mobileNumber: "9876543210" });
    expect(userWithOtp.otp).toMatch(/^\d{6}$/);
    expect(userWithOtp.otpExpiry).toBeTruthy();

    const verify = await request(app).post("/api/signin/verify-otp").send({ mobileNumber: "9876543210", otp: userWithOtp.otp });
    expect(verify.status).toBe(200);
    expect(verify.body).toEqual(expect.objectContaining({
      message: "OTP verified successfully",
      userId: String(userWithOtp._id),
      isVerified: true,
      name: null
    }));
    expect(verify.body.token).toBeTruthy();

    const verifiedUser = await User.findById(userWithOtp._id);
    expect(verifiedUser.otp).toBeNull();
    expect(verifiedUser.otpExpiry).toBeNull();
  });

  test("accepts existing auth payload with phone alias", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ status: "success" })
    }));

    const send = await request(app).post("/api/signin/send-otp").send({
      countryCode: "+91",
      phone: "6385404182",
      deviceId: "device_123"
    });
    expect(send.status).toBe(200);
    expect(send.body.message).toBe("OTP sent successfully");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("to_mobileno=6385404182"));

    const userWithOtp = await User.findOne({ mobileNumber: "6385404182" });
    expect(userWithOtp.otp).toMatch(/^\d{6}$/);
  });

  test("accepts plain text success response from SMS gateway", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => "Message submitted successfully"
    }));

    const send = await request(app).post("/api/signin/send-otp").send({ mobileNumber: "9876543212" });
    expect(send.status).toBe(200);

    const userWithOtp = await User.findOne({ mobileNumber: "9876543212" });
    expect(userWithOtp.otp).toMatch(/^\d{6}$/);
  });

  test("auth verify accepts OTP created by signin send", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ status: "success" })
    }));

    const send = await request(app).post("/api/signin/send-otp").send({ phone: "7418268091" });
    expect(send.status).toBe(200);

    const userWithOtp = await User.findOne({ mobileNumber: "7418268091" });
    const verify = await request(app).post("/api/v1/auth/customer/otp/verify").send({
      requestId: "otp_req_actual_value_from_send_response",
      phone: "7418268091",
      otp: userWithOtp.otp
    });

    expect(verify.status).toBe(200);
    expect(verify.body.data.accessToken).toBeTruthy();
    expect(verify.body.data.user._id).toBe(String(userWithOtp._id));
  });

  test("does not save OTP when SMS gateway fails", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ status: "failed" })
    }));

    const res = await request(app).post("/api/signin/send-otp").send({ mobileNumber: "9876543211" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to send OTP via SMS");

    const user = await User.findOne({ mobileNumber: "9876543211" });
    expect(user.otp).toBeNull();
    expect(user.otpExpiry).toBeNull();
  });
});
