import { readFileSync } from "node:fs";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../shared/errors/AppError.js";

const DEFAULT_OTP_TEMPLATE =
  // Must match the DLT-approved template for sender EVOLGN.
  "Dear Applicant, Your OTP for Mobile No. Verification is {otp} . MJPTBCWREIS - EVOLGN";

const readLegacySmsVendorUrl = () => {
  try {
    const config = JSON.parse(readFileSync(new URL("../../config.json", import.meta.url), "utf8"));
    return typeof config.smsvendor === "string" ? config.smsvendor.trim() : "";
  } catch {
    return "";
  }
};

const resolveSmsVendorUrl = () => {
  const fromEnv = String(env.SMS_VENDOR_URL || env.SMS_PROVIDER_URL || "").trim();
  return fromEnv || readLegacySmsVendorUrl();
};

export const buildOtpSmsMessage = (otp) => {
  const template = String(env.SMS_OTP_MESSAGE_TEMPLATE || DEFAULT_OTP_TEMPLATE);
  return template.includes("{otp}") ? template.replaceAll("{otp}", String(otp)) : `${template} ${otp}`;
};

const parseGatewayResponse = (text) => {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const isSuccessResponse = (data) => {
  const status = String(data.status || data.Status || data.STATUS || "").toLowerCase();
  if (["success", "sent", "submitted", "ok"].includes(status)) return true;
  if (typeof data.raw === "string" && /\b(success|sent|submitted)\b/i.test(data.raw)) return true;
  return false;
};

const providerMessage = (data) => {
  const message = data.Message || data.message || data.error || data.Error || data.raw;
  return typeof message === "string" && message.trim() ? message.trim() : null;
};

const mapSmsProviderError = (data, httpStatus) => {
  const message = (providerMessage(data) || "").toLowerCase();
  const statusId = String(data.status_id || data.statusId || data.code || "").toLowerCase();

  if (
    statusId.includes("1008")
    || message.includes("insufficient sms credits")
    || message.includes("insufficient credit")
    || message.includes("low balance")
    || message.includes("no credits")
  ) {
    return new AppError(
      503,
      "SMS_CREDITS_EXHAUSTED",
      "SMS provider has insufficient credits. Please recharge the SMS account or contact support.",
      data
    );
  }

  if (
    message.includes("invalid user")
    || message.includes("authentication")
    || message.includes("unauthorized")
    || message.includes("invalid password")
    || statusId.includes("auth")
  ) {
    return new AppError(
      502,
      "SMS_PROVIDER_AUTH_FAILED",
      "SMS provider authentication failed. Check SMS vendor credentials.",
      data
    );
  }

  if (
    message.includes("invalid mobile")
    || message.includes("invalid number")
    || message.includes("invalid phone")
    || statusId.includes("invalid_mobile")
  ) {
    return new AppError(
      400,
      "SMS_INVALID_MOBILE",
      "SMS provider rejected this phone number. Please check the number and try again.",
      data
    );
  }

  return new AppError(
    httpStatus >= 400 && httpStatus < 500 ? httpStatus : 502,
    "SMS_DELIVERY_FAILED",
    providerMessage(data) || "Failed to send OTP via SMS. Please try again shortly.",
    data
  );
};

const deliverViaVendor = async ({ mobileNumber, otp }) => {
  const vendorUrl = resolveSmsVendorUrl();
  if (!vendorUrl) {
    throw new AppError(500, "SMS_CONFIG_MISSING", "SMS vendor is not configured. Set SMS_VENDOR_URL or config.json smsvendor.");
  }

  const url = `${vendorUrl}to_mobileno=${encodeURIComponent(mobileNumber)}&sms_text=${encodeURIComponent(buildOtpSmsMessage(otp))}`;
  logger.info({
    event: "sms_otp_vendor_request",
    mobileNumber,
    vendorHost: (() => {
      try {
        return new URL(vendorUrl).host;
      } catch {
        return "invalid-url";
      }
    })()
  });

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    logger.error({
      event: "sms_otp_vendor_network_error",
      mobileNumber,
      error: error.message
    });
    throw new AppError(502, "SMS_PROVIDER_UNAVAILABLE", "Could not reach the SMS provider. Please try again shortly.");
  }

  const rawText = await response.text();
  const data = parseGatewayResponse(rawText);
  logger.info({
    event: "sms_otp_vendor_response",
    mobileNumber,
    httpStatus: response.status,
    providerStatus: data.status || data.Status || null,
    providerStatusId: data.status_id || data.statusId || null,
    providerMessage: providerMessage(data)
  });

  if (!response.ok || !isSuccessResponse(data)) {
    throw mapSmsProviderError(data, response.status);
  }

  return data;
};

const deliverViaLog = async ({ mobileNumber, otp }) => {
  if (env.NODE_ENV === "production") {
    throw new AppError(500, "SMS_LOG_MODE_FORBIDDEN", "SMS log delivery mode is not allowed in production.");
  }
  logger.warn({
    event: "sms_otp_log_delivery",
    mobileNumber,
    otp,
    message: "SMS_DELIVERY_MODE=log — OTP logged for non-production testing only."
  });
  return { status: "success", deliveryMode: "log", mobileNumber };
};

export const sendOtpViaSmsVendor = async ({ mobileNumber, otp }) => {
  const mode = String(env.SMS_DELIVERY_MODE || "vendor").toLowerCase();
  if (mode === "log") return deliverViaLog({ mobileNumber, otp });
  if (mode !== "vendor") {
    throw new AppError(500, "SMS_CONFIG_INVALID", `Unsupported SMS_DELIVERY_MODE "${mode}". Use "vendor" or "log".`);
  }
  return deliverViaVendor({ mobileNumber, otp });
};
