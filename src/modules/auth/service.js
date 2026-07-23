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
import { sendOtpViaSmsVendor } from "../../services/smsVendor.service.js";
import { logger } from "../../config/logger.js";
const OTP_DIGITS = 6;
const normalizePhone = (countryCode, phone) => countryCode.replace(/\D/g, "") + phone.replace(/\D/g, "");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const isPlaceholderRequestId = (requestId) => !requestId || requestId.includes("{{") || requestId.includes("actual_value");
export const sendCustomerOtp = async ({ countryCode = "+91", phone, deviceId, ip, purpose = "login" }) => {
  const requestId = "otp_req_" + crypto.randomUUID();
  const otp = String(crypto.randomInt(10 ** (OTP_DIGITS - 1), 10 ** OTP_DIGITS));
  const redis = getRedis();
  const phoneNormalized = normalizePhone(countryCode, phone);
  const cooldownKey = `otp:cooldown:${phoneNormalized}:${deviceId || ip || "unknown"}`;
  logger.info({ event: "customer_otp_send_start", requestId, phone, phoneNormalized, purpose, deviceId, ip, smsMode: env.SMS_DELIVERY_MODE });
  if (await redis.get(cooldownKey)) throw conflict("OTP resend cooldown is active.");
  const payload = { phone, phoneNormalized, otp, attempts: 0, deviceId, ip, purpose, createdAt: new Date().toISOString() };
  try {
    await sendOtpViaSmsVendor({ mobileNumber: phone, otp });
  } catch (error) {
    logger.error({
      event: "customer_otp_sms_delivery_failed",
      requestId,
      phoneNormalized,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details || null
    });
    throw error;
  }
  await redis.set("otp:" + requestId, JSON.stringify(payload), "EX", env.OTP_EXPIRES_SECONDS);
  await redis.set(`otp:latest:${phoneNormalized}`, requestId, "EX", env.OTP_EXPIRES_SECONDS);
  await redis.set(cooldownKey, "1", "EX", env.OTP_RESEND_SECONDS);
  // Notification enqueue must not fail OTP delivery after SMS + Redis succeeded.
  enqueueNotification({
    event: "otp_sent",
    channel: "sms",
    recipient: phoneNormalized,
    templateId: "customer_otp",
    payload: { requestId, expiresInSeconds: env.OTP_EXPIRES_SECONDS }
  }).catch((error) => {
    logger.warn({ event: "customer_otp_notification_enqueue_failed", requestId, phoneNormalized, error: error.message });
  });
  logger.info({ event: "customer_otp_send_success", requestId, phoneNormalized, expiresInSeconds: env.OTP_EXPIRES_SECONDS });
  return {
    requestId,
    expiresInSeconds: env.OTP_EXPIRES_SECONDS,
    canResendAt: new Date(Date.now() + env.OTP_RESEND_SECONDS * 1000).toISOString()
  };
};
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const sessionKey = (sid) => `session:${sid}`;
const sessionIndexKey = (type, sub) => `${type}:sessions:${sub}`;
const refreshKey = (token) => "refresh:" + hash(token);
const usedRefreshKey = (jti) => `refresh:used:${jti}`;

const readSessionIndex = async (type, sub) => {
  const raw = await getRedis().get(sessionIndexKey(type, sub));
  if (!raw) return [];
  try {
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeSessionIndex = async (type, sub, sids) => {
  const unique = [...new Set(sids.filter(Boolean))];
  await getRedis().set(sessionIndexKey(type, sub), JSON.stringify(unique), "EX", REFRESH_TTL_SECONDS);
  return unique;
};

const registerSession = async (session) => {
  const sids = await readSessionIndex(session.type, session.sub);
  await writeSessionIndex(session.type, session.sub, [...sids, session.sid]);
};

const unregisterSession = async (session) => {
  if (!session?.type || !session?.sub || !session?.sid) return;
  const sids = await readSessionIndex(session.type, session.sub);
  await writeSessionIndex(session.type, session.sub, sids.filter((sid) => sid !== session.sid));
};

const readSession = async (sid) => {
  const raw = sid ? await getRedis().get(sessionKey(sid)) : null;
  return raw ? JSON.parse(raw) : null;
};

const publicSession = (session, actor) => ({
  sid: session.sid,
  type: session.type,
  role: session.role,
  deviceId: session.deviceId,
  userAgent: session.userAgent,
  ip: session.ip,
  status: session.status,
  createdAt: session.createdAt,
  lastSeenAt: session.lastSeenAt,
  current: actor?.sid === session.sid
});

const verifyStoredUserOtp = async ({ countryCode = "+91", phone, otp, deviceId, userAgent, ip }) => {
  const phoneNormalized = normalizePhone(countryCode, phone);
  const user = await User.findOne({ $or: [{ mobileNumber: phone }, { phoneNormalized }] });
  if (!user || !user.otp) throw unauthorized("OTP expired or invalid.");
  if (!user.otpExpiry || new Date() > new Date(user.otpExpiry)) throw unauthorized("OTP expired or invalid.");
  if (String(user.otp).trim() !== String(otp).trim()) throw unauthorized("Invalid OTP.");

  user.otp = null;
  user.otpExpiry = null;
  user.isVerified = true;
  user.lastLoginAt = new Date();
  await user.save();
  return issueSession({ id: user._id, type: "customer", role: user.role, userType: user.userType }, { user }, { deviceId, userAgent, ip });
};

export const verifyCustomerOtp = async ({ requestId, countryCode = "+91", phone, otp, deviceId, userAgent, ip, purpose = "login" }) => {
  const redis = getRedis();
  const phoneNormalized = normalizePhone(countryCode, phone);
  const resolvedRequestId = isPlaceholderRequestId(requestId) ? await redis.get(`otp:latest:${phoneNormalized}`) : requestId;
  const raw = resolvedRequestId ? await redis.get("otp:" + resolvedRequestId) : null;
  if (!raw) return verifyStoredUserOtp({ countryCode, phone, otp, deviceId, userAgent, ip });
  const rec = JSON.parse(raw);
  if (rec.phone !== phone) throw unauthorized("OTP request mismatch.");
  if (rec.attempts >= env.OTP_MAX_ATTEMPTS) throw conflict("OTP verification locked.");
  if (rec.otp !== otp) { rec.attempts += 1; await redis.set("otp:" + resolvedRequestId, JSON.stringify(rec), "EX", env.OTP_EXPIRES_SECONDS); throw unauthorized("Invalid OTP."); }
  await redis.del("otp:" + resolvedRequestId);
  await redis.del(`otp:latest:${phoneNormalized}`);
  if ((rec.purpose || purpose) === "change_phone") return { verified: true, phone, phoneNormalized };
  // Keep phone / mobileNumber / phoneNormalized in sync so email-profile and phone-login accounts share one identity.
  let user = await User.findOne({
    $or: [
      { phoneNormalized: rec.phoneNormalized },
      { mobileNumber: phone },
      { phone },
      { phone: `+91 ${phone}` }
    ]
  });
  if (user) {
    user.phone = `+91 ${phone}`;
    user.phoneNormalized = rec.phoneNormalized;
    user.mobileNumber = phone;
    user.isVerified = true;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    user = await User.create({
      referenceId: makeReferenceId("users"),
      phone: `+91 ${phone}`,
      phoneNormalized: rec.phoneNormalized,
      mobileNumber: phone,
      isVerified: true,
      role: "buyer",
      userType: "resident",
      registeredAt: new Date(),
      lastLoginAt: new Date()
    });
  }
  logger.info({ event: "customer_otp_verified", userId: String(user._id), phoneNormalized: rec.phoneNormalized });
  return issueSession({ id: user._id, type: "customer", role: user.role, userType: user.userType }, { user }, { deviceId, userAgent, ip });
};
export const adminLogin = async ({ email, password, deviceId, userAgent, ip }) => {
  const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true }).select("+passwordHash");
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) throw unauthorized("Invalid credentials.");
  admin.permissions = admin.permissions?.length ? admin.permissions : ROLE_PERMISSIONS[admin.role] || [];
  admin.lastLoginAt = new Date();
  await admin.save();
  const adminPayload = admin.toObject();
  delete adminPayload.passwordHash;
  return issueSession({ id: admin._id, type: "admin", role: admin.role, permissions: admin.permissions }, { admin: adminPayload }, { deviceId, userAgent, ip });
};
export const issueSession = async (payload, data, metadata = {}) => {
  const sid = metadata.sid || crypto.randomUUID();
  const jti = crypto.randomUUID();
  const tokenPayload = { sub: String(payload.id), type: payload.type, role: payload.role, permissions: payload.permissions, userType: payload.userType, sid };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({ ...tokenPayload, jti });
  const session = { sid, sub: tokenPayload.sub, type: tokenPayload.type, role: tokenPayload.role, permissions: tokenPayload.permissions, userType: tokenPayload.userType, deviceId: metadata.deviceId, userAgent: metadata.userAgent, ip: metadata.ip, status: "active", createdAt: metadata.createdAt || new Date().toISOString(), lastSeenAt: new Date().toISOString(), currentJti: jti };
  await getRedis().set(sessionKey(sid), JSON.stringify(session), "EX", REFRESH_TTL_SECONDS);
  await registerSession(session);
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
  const session = await readSession(decoded.sid);
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
    if (decoded?.sid) {
      const session = await readSession(decoded.sid);
      await getRedis().del(sessionKey(decoded.sid));
      await unregisterSession(session);
    }
  }
  await blacklistAccessToken(accessToken);
  return { revoked: true, actor };
};

export const listAdminSessions = async (actor) => {
  const sids = await readSessionIndex("admin", String(actor.id));
  const sessions = (await Promise.all(sids.map(readSession))).filter((session) => session?.status === "active");
  await writeSessionIndex("admin", String(actor.id), sessions.map((session) => session.sid));
  return sessions.map((session) => publicSession(session, actor)).sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
};

export const revokeAdminSession = async (sid, actor) => {
  const session = await readSession(sid);
  if (!session || session.type !== "admin" || session.sub !== String(actor.id)) throw unauthorized("Session not found.");
  await getRedis().del(sessionKey(sid));
  await unregisterSession(session);
  return { revoked: true, sid };
};

export const revokeAllAdminSessions = async (actor) => {
  const sids = await readSessionIndex("admin", String(actor.id));
  let revoked = 0;
  for (const sid of sids) {
    const session = await readSession(sid);
    if (!session || actor.sid === sid) continue;
    await getRedis().del(sessionKey(sid));
    revoked += 1;
  }
  await writeSessionIndex("admin", String(actor.id), [actor.sid]);
  return { revoked };
};