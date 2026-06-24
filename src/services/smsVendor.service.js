import { readFileSync } from "node:fs";
import { AppError } from "../shared/errors/AppError.js";

const config = JSON.parse(readFileSync(new URL("../../config.json", import.meta.url), "utf8"));

export const buildOtpSmsMessage = (otp) => `Dear Applicant, Your OTP for Mobile No. Verification is ${otp} . MJPTBCWREIS - EVOLGN`;

const parseGatewayResponse = (text) => {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
};

const isSuccessResponse = (data) => {
  const status = String(data.status || data.Status || data.STATUS || "").toLowerCase();
  if (["success", "sent", "submitted"].includes(status)) return true;
  return typeof data.raw === "string" && /\b(success|sent|submitted)\b/i.test(data.raw);
};

export const sendOtpViaSmsVendor = async ({ mobileNumber, otp }) => {
  if (!config.smsvendor) throw new AppError(500, "SMS_CONFIG_MISSING", "SMS vendor is not configured.");
  const url = `${config.smsvendor}to_mobileno=${encodeURIComponent(mobileNumber)}&sms_text=${encodeURIComponent(buildOtpSmsMessage(otp))}`;
  const response = await fetch(url);
  const data = parseGatewayResponse(await response.text());
  if (!response.ok || !isSuccessResponse(data)) {
    throw new AppError(500, "SMS_DELIVERY_FAILED", "Failed to send OTP via SMS", data);
  }
  return data;
};
