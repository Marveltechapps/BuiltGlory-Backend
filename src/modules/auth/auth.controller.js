import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok } from "../../shared/response.js";
import * as service from "./auth.service.js";
import { writeAuditLog } from "../../services/audit.service.js";

export const emailOtpController = {
  sendOtp: asyncHandler(async (req, res) => {
    console.log("EMAIL_OTP_ROUTE_HIT", {
      path: req.originalUrl,
      email: req.body.email
    });
    return ok(res, await service.sendEmailOtp({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    }));
  }),

  resendOtp: asyncHandler(async (req, res) => ok(res, await service.resendEmailOtp({
    ...req.body,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  }))),

  verifyOtp: asyncHandler(async (req, res) => {
    const data = await service.verifyEmailOtp({
      ...req.body,
      deviceId: req.headers["x-device-id"],
      userAgent: req.headers["user-agent"],
      ip: req.ip
    });
    await writeAuditLog({
      actor: { type: "customer", id: data.user._id },
      action: "customer.email_login",
      resourceType: "customer",
      resourceId: data.user._id,
      before: null,
      after: { email: data.user.email },
      req
    });
    ok(res, data);
  })
};
