import { asyncHandler } from "../../shared/asyncHandler.js";
import * as service from "./service.js";

const normalizeOtpBody = (body) => ({ ...body, mobileNumber: body.mobileNumber || body.phone });

const respond = (handler, fallbackError) => asyncHandler(async (req, res) => {
  try {
    return res.status(200).json(await handler(normalizeOtpBody(req.body)));
  } catch (error) {
    if (error.statusCode === 400) return res.status(400).json({ message: error.message });
    return res.status(error.statusCode || 500).json({ error: error.message || fallbackError, details: error.details });
  }
});

export const controller = {
  sendOtp: respond(service.sendOtp, "Failed to send OTP"),
  verifyOtp: respond(service.verifyOtp, "Failed to verify OTP"),
  resendOtp: respond(service.resendOtp, "Failed to resend OTP")
};
