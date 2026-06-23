import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok } from "../../shared/response.js";
import * as service from "./service.js";
import { writeAuditLog } from "../../services/audit.service.js";
export const controller = {
  sendOtp: asyncHandler(async (req, res) => ok(res, await service.sendCustomerOtp({ ...req.body, ip: req.ip }))),
  verifyOtp: asyncHandler(async (req, res) => {
    const data = await service.verifyCustomerOtp({ ...req.body, deviceId: req.headers["x-device-id"], userAgent: req.headers["user-agent"], ip: req.ip });
    await writeAuditLog({ actor: { type: "customer", id: data.user._id }, action: "customer.login", resourceType: "customer", resourceId: data.user._id, before: null, after: { phone: data.user.phoneNormalized }, req });
    ok(res, data);
  }),
  adminLogin: asyncHandler(async (req, res) => {
    const data = await service.adminLogin({ ...req.body, deviceId: req.headers["x-device-id"], userAgent: req.headers["user-agent"], ip: req.ip });
    await writeAuditLog({ actor: { type: "admin", id: data.admin._id }, action: "admin.login", resourceType: "admin", resourceId: data.admin._id, before: null, after: { email: data.admin.email, role: data.admin.role }, req });
    ok(res, data);
  }),
  refresh: asyncHandler(async (req, res) => ok(res, await service.refresh({ ...req.body, deviceId: req.headers["x-device-id"], userAgent: req.headers["user-agent"], ip: req.ip }))),
  logout: asyncHandler(async (req, res) => {
    const accessToken = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const data = await service.logout({ ...req.body, accessToken });
    if (data.actor) await writeAuditLog({ actor: data.actor, action: `${data.actor.type}.logout`, resourceType: data.actor.type, resourceId: data.actor.id, before: null, after: { revoked: true }, req });
    ok(res, { revoked: data.revoked });
  })
};