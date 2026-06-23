import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { getRedis } from "../../config/redis.js";
import { User } from "../users/model.js";
import { Admin } from "../admins/model.js";
import { makeReferenceId } from "../../shared/id.js";
import { blacklistAccessToken, signAccessToken, signRefreshToken } from "../../middleware/auth.js";
import { unauthorized, conflict } from "../../shared/errors/AppError.js";
import { ROLE_PERMISSIONS } from "../../constants/permissions.js";
import { enqueueNotification } from "../../services/notification.service.js";
const normalizePhone = (countryCode, phone) => countryCode.replace(/\D/g, "") + phone.replace(/\D/g, "");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const sendCustomerOtp = async ({ countryCode = "+91", phone, deviceId, ip }) => {
  const requestId = "otp_req_" + crypto.randomUUID();
  const otp = String(crypto.randomInt(100000, 999999));
  const redis = getRedis();
  const phoneNormalized = normalizePhone(countryCode, phone);
  const cooldownKey = `otp:cooldown:${phoneNormalized}:${deviceId || ip || "unknown"}`;
  if (await redis.get(cooldownKey)) throw conflict("OTP resend cooldown is active.");
  const payload = { phone, phoneNormalized, otp, attempts: 0, deviceId, ip, createdAt: new Date().toISOString() };
  await redis.set("otp:" + requestId, JSON.stringify(payload), "EX", env.OTP_EXPIRES_SECONDS);
  await redis.set(cooldownKey, "1", "EX", env.OTP_RESEND_SECONDS);
  await enqueueNotification({ event: "otp_sent", channel: "sms", recipient: phoneNormalized, templateId: "customer_otp", payload: { requestId, otp, expiresInSeconds: env.OTP_EXPIRES_SECONDS } });
  return { requestId, expiresInSeconds: env.OTP_EXPIRES_SECONDS, canResendAt: new Date(Date.now() + env.OTP_RESEND_SECONDS * 1000).toISOString() };
};
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const sessionKey = (sid) => `session:${sid}`;
const refreshKey = (token) => "refresh:" + hash(token);
const usedRefreshKey = (jti) => `refresh:used:${jti}`;

export const verifyCustomerOtp = async ({ requestId, phone, otp, deviceId, userAgent, ip }) => {
  const redis = getRedis();
  const raw = await redis.get("otp:" + requestId);
  if (!raw) throw unauthorized("OTP expired or invalid.");
  const rec = JSON.parse(raw);
  if (rec.phone !== phone) throw unauthorized("OTP request mismatch.");
  if (rec.attempts >= env.OTP_MAX_ATTEMPTS) throw conflict("OTP verification locked.");
  if (rec.otp !== otp) { rec.attempts += 1; await redis.set("otp:" + requestId, JSON.stringify(rec), "EX", env.OTP_EXPIRES_SECONDS); throw unauthorized("Invalid OTP."); }
  await redis.del("otp:" + requestId);
  const user = await User.findOneAndUpdate({ phoneNormalized: rec.phoneNormalized }, { $setOnInsert: { referenceId: makeReferenceId("users"), phone: "+91 " + phone, phoneNormalized: rec.phoneNormalized, role: "buyer", userType: "resident", registeredAt: new Date() }, $set: { lastLoginAt: new Date() } }, { upsert: true, new: true });
  return issueSession({ id: user._id, type: "customer", role: user.role, userType: user.userType }, { user }, { deviceId, userAgent, ip });
};
export const adminLogin = async ({ email, password, deviceId, userAgent, ip }) => {
  const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true }).select("+passwordHash");
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) throw unauthorized("Invalid credentials.");
  admin.permissions = admin.permissions?.length ? admin.permissions : ROLE_PERMISSIONS[admin.role] || [];
  admin.lastLoginAt = new Date();
  await admin.save();
  return issueSession({ id: admin._id, type: "admin", role: admin.role, permissions: admin.permissions }, { admin }, { deviceId, userAgent, ip });
};
export const issueSession = async (payload, data, metadata = {}) => {
  const sid = metadata.sid || crypto.randomUUID();
  const jti = crypto.randomUUID();
  const tokenPayload = { sub: String(payload.id), type: payload.type, role: payload.role, permissions: payload.permissions, userType: payload.userType, sid };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({ ...tokenPayload, jti });
  const session = { sid, sub: tokenPayload.sub, type: tokenPayload.type, role: tokenPayload.role, permissions: tokenPayload.permissions, userType: tokenPayload.userType, deviceId: metadata.deviceId, userAgent: metadata.userAgent, ip: metadata.ip, status: "active", createdAt: metadata.createdAt || new Date().toISOString(), lastSeenAt: new Date().toISOString(), currentJti: jti };
  await getRedis().set(sessionKey(sid), JSON.stringify(session), "EX", REFRESH_TTL_SECONDS);
  await getRedis().set(refreshKey(refreshToken), JSON.stringify({ ...tokenPayload, jti, deviceId: metadata.deviceId, userAgent: metadata.userAgent, ip: metadata.ip }), "EX", REFRESH_TTL_SECONDS);
  return { accessToken, refreshToken, expiresInSeconds: payload.type === "admin" ? env.ADMIN_INACTIVITY_SECONDS : 900, ...data };
};
export const refresh = async ({ refreshToken, deviceId, userAgent, ip }) => {
  const redis = getRedis();
  const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
  const rec = await redis.get(refreshKey(refreshToken));
  if (!rec) {
    if (decoded.jti && await redis.get(usedRefreshKey(decoded.jti))) {
      if (decoded.sid) await redis.set(sessionKey(decoded.sid), JSON.stringify({ sid: decoded.sid, sub: decoded.sub, type: decoded.type, status: "compromised", compromisedAt: new Date().toISOString(), reason: "refresh_token_reuse" }), "EX", REFRESH_TTL_SECONDS);
      throw conflict("Refresh token reuse detected. Session invalidated.");
    }
    throw unauthorized("Refresh token revoked or expired.");
  }
  const sessionRaw = decoded.sid ? await redis.get(sessionKey(decoded.sid)) : null;
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  if (!session || session.status !== "active") throw unauthorized("Session is no longer active.");
  if (decoded.type === "admin") {
    const admin = await Admin.findById(decoded.sub);
    if (!admin || !admin.isActive) throw unauthorized("Admin account inactive.");
  } else {
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive || user.isBlocked) throw unauthorized("Customer account unavailable.");
  }
  await redis.del(refreshKey(refreshToken));
  await redis.set(usedRefreshKey(decoded.jti), "1", "EX", REFRESH_TTL_SECONDS);
  return issueSession({ id: decoded.sub, type: decoded.type, role: decoded.role, permissions: decoded.permissions, userType: decoded.userType }, {}, { sid: decoded.sid, deviceId: deviceId || session.deviceId, userAgent: userAgent || session.userAgent, ip: ip || session.ip, createdAt: session.createdAt });
};
export const logout = async ({ refreshToken, accessToken }) => {
  let actor;
  let decoded;
  if (refreshToken) {
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
      actor = { type: decoded.type, id: decoded.sub, role: decoded.role, permissions: decoded.permissions };
    } catch {
      actor = undefined;
    }
    await getRedis().del(refreshKey(refreshToken));
    if (decoded?.sid) await getRedis().del(sessionKey(decoded.sid));
  }
  await blacklistAccessToken(accessToken);
  return { revoked: true, actor };
};