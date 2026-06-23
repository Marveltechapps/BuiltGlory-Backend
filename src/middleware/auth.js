import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";
import { unauthorized, forbidden } from "../shared/errors/AppError.js";
import { Admin } from "../modules/admins/model.js";
import { User } from "../modules/users/model.js";
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
export const signAccessToken = (payload) => jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: payload.type === "admin" ? Number(env.ADMIN_INACTIVITY_SECONDS) : env.JWT_ACCESS_EXPIRES_IN, issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, jwtid: crypto.randomUUID() });
export const signRefreshToken = (payload) => jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
export const blacklistAccessToken = async (token) => {
  if (!token) return;
  const decoded = jwt.decode(token);
  const ttl = decoded?.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1) : 900;
  await getRedis().set("access:blacklist:" + tokenHash(token), "1", "EX", ttl);
};
const parse = (req) => (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
export const authenticate = (expectedType) => async (req, res, next) => {
  try {
    const token = parse(req);
    if (!token) throw unauthorized();
    if (await getRedis().get("access:blacklist:" + tokenHash(token))) throw unauthorized("Access token has been revoked.");
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    if (expectedType && decoded.type !== expectedType) throw unauthorized("Invalid token type.");
    if (decoded.type === "admin") {
      const admin = await Admin.findById(decoded.sub);
      if (!admin || !admin.isActive) throw unauthorized("Admin account inactive.");
      req.actor = { type: "admin", id: admin._id, role: admin.role, permissions: admin.permissions };
    } else {
      const user = await User.findById(decoded.sub);
      if (!user || !user.isActive || user.isBlocked) throw unauthorized("Customer account unavailable.");
      req.actor = { type: "customer", id: user._id, role: user.role, userType: user.userType };
    }
    next();
  } catch (error) { next(error.isOperational ? error : unauthorized("Invalid or expired token.")); }
};
export const requirePermission = (permission) => (req, res, next) => {
  if (req.actor?.type !== "admin") return next(forbidden("Admin access required."));
  if (req.actor.role === "super_admin" || req.actor.permissions?.includes(permission)) return next();
  return next(forbidden());
};