import rateLimit, { ipKeyGenerator } from "express-rate-limit";
export const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 25, standardHeaders: true, legacyHeaders: false });
export const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, keyGenerator: (req) => req.body?.phone || req.body?.mobileNumber || req.body?.email || ipKeyGenerator(req.ip), standardHeaders: true, legacyHeaders: false });
export const emailOtpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 6, keyGenerator: (req) => req.body?.email || ipKeyGenerator(req.ip), standardHeaders: true, legacyHeaders: false });
export const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });