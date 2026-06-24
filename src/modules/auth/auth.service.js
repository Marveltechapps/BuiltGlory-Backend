import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError, conflict, unauthorized } from "../../shared/errors/AppError.js";
import { makeReferenceId } from "../../shared/id.js";
import { issueSession } from "./service.js";
import { repository } from "./auth.repository.js";
import { sendEmailOtp as deliverEmailOtp } from "./email.service.js";

const OTP_DIGITS = 6;
const normalizeEmail = (email) => email.trim().toLowerCase();
const generateOtp = () => String(crypto.randomInt(10 ** (OTP_DIGITS - 1), 10 ** OTP_DIGITS));
const hashOtp = ({ email, otp, salt }) => crypto
  .createHmac("sha256", env.JWT_SECRET || env.JWT_ACCESS_SECRET)
  .update(`${email}:${salt}:${otp}`)
  .digest("hex");

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const secondsUntil = (date) => Math.max(Math.ceil((date.getTime() - Date.now()) / 1000), 0);

const assertCanSend = async (email) => {
  const activeOtp = await repository.findLatestActiveEmailOtp({ email });
  if (activeOtp?.resendAvailableAt && activeOtp.resendAvailableAt > new Date()) {
    throw new AppError(409, "OTP_RESEND_COOLDOWN", "OTP resend cooldown is active.", [{
      field: "email",
      message: `Please wait ${secondsUntil(activeOtp.resendAvailableAt)} seconds before requesting another OTP.`
    }]);
  }
};

const createAndDeliverOtp = async ({ email, ip, userAgent }) => {
  const normalizedEmail = normalizeEmail(email);
  console.log("EMAIL_OTP_AUTH_SERVICE_START", { email: normalizedEmail });
  await assertCanSend(normalizedEmail);
  console.log("EMAIL_OTP_COOLDOWN_PASSED", { email: normalizedEmail });
  await repository.invalidateActiveEmailOtps({ email: normalizedEmail });

  const otp = generateOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const otpRecord = await repository.createEmailOtp({
    requestId: `email_otp_${crypto.randomUUID()}`,
    email: normalizedEmail,
    otpHash: hashOtp({ email: normalizedEmail, otp, salt }),
    salt,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    expiresAt: new Date(now + env.OTP_EXPIRES_SECONDS * 1000),
    resendAvailableAt: new Date(now + env.OTP_RESEND_SECONDS * 1000),
    ip,
    userAgent
  });

  try {
    console.log("EMAIL_OTP_DELIVER_EMAIL_SERVICE_CALL", {
      requestId: otpRecord.requestId,
      email: normalizedEmail
    });
    await deliverEmailOtp({ email: normalizedEmail, otp });
    console.log("EMAIL_OTP_DELIVER_EMAIL_SERVICE_DONE", {
      requestId: otpRecord.requestId,
      email: normalizedEmail
    });
    const sentOtp = await repository.markEmailOtpSent(otpRecord._id);
    logger.info({ event: "email_otp_sent", requestId: sentOtp.requestId, email: normalizedEmail });
    return {
      requestId: sentOtp.requestId,
      email: normalizedEmail,
      expiresInSeconds: env.OTP_EXPIRES_SECONDS,
      canResendAt: sentOtp.resendAvailableAt.toISOString()
    };
  } catch (error) {
    await repository.markEmailOtpDeliveryFailed(otpRecord._id, error.message);
    logger.error({
      event: "email_otp_delivery_failed",
      requestId: otpRecord.requestId,
      email: normalizedEmail,
      error: error.message,
      code: error.code,
      details: error.details
    });
    if (error instanceof AppError) throw error;
    throw new AppError(502, "EMAIL_DELIVERY_FAILED", "Failed to send verification email.", error.details);
  }
};

export const sendEmailOtp = createAndDeliverOtp;
export const resendEmailOtp = createAndDeliverOtp;

export const verifyEmailOtp = async ({ email, otp, requestId, deviceId, userAgent, ip }) => {
  const normalizedEmail = normalizeEmail(email);
  const otpRecord = requestId
    ? await repository.findActiveEmailOtpByRequestId({ email: normalizedEmail, requestId, includeSecrets: true })
    : await repository.findLatestActiveEmailOtp({ email: normalizedEmail, includeSecrets: true });

  if (!otpRecord) throw unauthorized("OTP expired or invalid.");
  if (otpRecord.lockedAt || otpRecord.attempts >= otpRecord.maxAttempts) throw conflict("OTP verification locked.");

  const suppliedHash = hashOtp({ email: normalizedEmail, otp, salt: otpRecord.salt });
  if (!timingSafeEqual(suppliedHash, otpRecord.otpHash)) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= otpRecord.maxAttempts) otpRecord.lockedAt = new Date();
    await repository.saveEmailOtp(otpRecord);
    throw unauthorized("Invalid OTP.");
  }

  otpRecord.usedAt = new Date();
  await repository.saveEmailOtp(otpRecord);

  const user = await repository.upsertVerifiedEmailUser({
    email: normalizedEmail,
    referenceId: makeReferenceId("users")
  });

  logger.info({ event: "email_otp_verified", requestId: otpRecord.requestId, email: normalizedEmail, userId: String(user._id) });
  return issueSession(
    { id: user._id, type: "customer", role: user.role, userType: user.userType },
    { user },
    { deviceId, userAgent, ip }
  );
};
