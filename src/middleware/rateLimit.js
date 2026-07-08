import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

const isDev = env.NODE_ENV === "development" || env.NODE_ENV === "test";

function rateLimitJsonHandler(req, res, next, options) {
  res.status(options.statusCode).json({
    error: {
      code: "RATE_LIMITED",
      message: typeof options.message === "string" ? options.message : "Too many requests. Please try again later.",
      details: []
    },
    meta: { requestId: res.locals.requestId }
  });
}

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler
};

export const generalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 1000
});

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 25
});

export const otpLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 8,
  keyGenerator: (req) => req.body?.phone || req.body?.mobileNumber || req.body?.email || ipKeyGenerator(req.ip)
});

export const emailOtpLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: isDev ? 30 : 6,
  keyGenerator: (req) => req.body?.email || ipKeyGenerator(req.ip)
});

export const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 50
});
