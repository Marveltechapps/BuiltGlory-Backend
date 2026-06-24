import { jest } from "@jest/globals";
import request from "supertest";

process.env.SMTP_HOST = "smtp.test";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "support@builtglory.com";
process.env.SMTP_PASS = "smtp-password";
process.env.EMAIL_FROM = "support@builtglory.com";

const sendMail = jest.fn(async () => ({ messageId: "email-otp-message" }));
const createTransport = jest.fn(() => ({ sendMail }));

jest.unstable_mockModule("nodemailer", () => ({
  default: { createTransport }
}));

const { app, setupIntegrationDb } = await import("./helpers/integrationHarness.js");
const { EmailOtp } = await import("../modules/auth/otp.model.js");
const { User } = await import("../modules/users/model.js");

jest.setTimeout(60_000);

setupIntegrationDb();

beforeEach(() => {
  sendMail.mockResolvedValue({
    messageId: "email-otp-message",
    response: "250 2.0.0 OK: queued",
    accepted: ["recipient@example.com"],
    rejected: [],
    envelope: {}
  });
});

afterEach(() => {
  sendMail.mockClear();
  createTransport.mockClear();
});

describe("email OTP authentication", () => {
  test("sends a hashed 6-digit OTP and verifies it for JWT tokens", async () => {
    const email = "customer@example.com";
    const send = await request(app).post("/api/v1/auth/email/otp/send").send({ email });

    expect(send.status).toBe(200);
    expect(send.body.data).toEqual(expect.objectContaining({
      email,
      expiresInSeconds: 300,
      requestId: expect.stringMatching(/^email_otp_/)
    }));
    const mailOptions = sendMail.mock.calls[0][0];
    expect(mailOptions).toEqual(expect.objectContaining({
      from: "support@builtglory.com",
      to: email,
      subject: "BuiltGlory Email Verification",
      text: expect.stringMatching(/\b\d{6}\b/),
      html: expect.stringContaining("<!doctype html>")
    }));

    const deliveredOtp = mailOptions.text.match(/\b\d{6}\b/)[0];
    expect(mailOptions.html).toContain(deliveredOtp);
    const storedOtp = await EmailOtp.findOne({ email }).select("+otpHash +salt");
    expect(storedOtp.otpHash).toBeTruthy();
    expect(storedOtp.otpHash).not.toBe(deliveredOtp);
    expect(storedOtp.salt).toBeTruthy();

    const verify = await request(app).post("/api/v1/auth/email/otp/verify").send({
      email,
      otp: deliveredOtp,
      requestId: send.body.data.requestId
    });

    expect(verify.status).toBe(200);
    expect(verify.body.data.accessToken).toBeTruthy();
    expect(verify.body.data.refreshToken).toBeTruthy();
    expect(verify.body.data.user.email).toBe(email);

    const usedOtp = await EmailOtp.findById(storedOtp._id);
    expect(usedOtp.usedAt).toBeTruthy();
    const user = await User.findOne({ email });
    expect(user.isEmailVerified).toBe(true);
  });

  test("returns failure and records delivery failure when SMTP authentication fails", async () => {
    const authError = Object.assign(new Error("Invalid login: 535 Authentication failed"), {
      code: "EAUTH",
      command: "AUTH PLAIN",
      responseCode: 535,
      response: "535 5.7.8 Authentication credentials invalid"
    });
    sendMail.mockRejectedValueOnce(authError);

    const email = "smtp-auth-fail@example.com";
    const send = await request(app).post("/api/v1/auth/email/otp/send").send({ email });

    expect(send.status).toBe(502);
    expect(send.body.error.code).toBe("EMAIL_DELIVERY_FAILED");
    expect(send.body.error.details).toEqual([expect.objectContaining({
      code: "EAUTH",
      command: "AUTH PLAIN",
      responseCode: 535,
      response: "535 5.7.8 Authentication credentials invalid"
    })]);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const failedOtp = await EmailOtp.findOne({ email });
    expect(failedOtp.deliveryFailedAt).toBeTruthy();
    expect(failedOtp.failureReason).toBe("Failed to send verification email.");
  });

  test("enforces resend cooldown", async () => {
    const email = "cooldown@example.com";
    await request(app).post("/api/v1/auth/email/otp/send").send({ email });

    const resend = await request(app).post("/api/v1/auth/email/otp/resend").send({ email });

    expect(resend.status).toBe(409);
    expect(resend.body.error.code).toBe("OTP_RESEND_COOLDOWN");
  });

  test("locks verification after five invalid attempts", async () => {
    const email = "locked@example.com";
    await request(app).post("/api/v1/auth/email/otp/send").send({ email });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const verify = await request(app).post("/api/v1/auth/email/otp/verify").send({ email, otp: "000000" });
      expect(verify.status).toBe(401);
    }

    const storedOtp = await EmailOtp.findOne({ email });
    expect(storedOtp.attempts).toBe(5);
    expect(storedOtp.lockedAt).toBeTruthy();
  });
});
