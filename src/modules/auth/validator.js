import Joi from "joi";
const otp = Joi.string().pattern(/^\d{6}$/).messages({ "string.pattern.base": "OTP must be a 6-digit numeric code." });
export const sendOtpValidator = Joi.object({ body: Joi.object({ countryCode: Joi.string().default("+91"), phone: Joi.string().pattern(/^\d{10}$/).required(), deviceId: Joi.string().allow("", null) }).required() }).unknown(true);
export const verifyOtpValidator = Joi.object({ body: Joi.object({ requestId: Joi.string().allow("", null), countryCode: Joi.string().default("+91"), phone: Joi.string().pattern(/^\d{10}$/).required(), otp: otp.required() }).required() }).unknown(true);
export const adminLoginValidator = Joi.object({ body: Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(8).required() }).required() }).unknown(true);
export const refreshValidator = Joi.object({ body: Joi.object({ refreshToken: Joi.string().required() }).required() }).unknown(true);