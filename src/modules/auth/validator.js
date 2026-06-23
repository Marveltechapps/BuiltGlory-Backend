import Joi from "joi";
export const sendOtpValidator = Joi.object({ body: Joi.object({ countryCode: Joi.string().default("+91"), phone: Joi.string().pattern(/^\d{10}$/).required(), deviceId: Joi.string().allow("", null) }).required() }).unknown(true);
export const verifyOtpValidator = Joi.object({ body: Joi.object({ requestId: Joi.string().required(), phone: Joi.string().pattern(/^\d{10}$/).required(), otp: Joi.string().pattern(/^\d{6}$/).required() }).required() }).unknown(true);
export const adminLoginValidator = Joi.object({ body: Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(8).required() }).required() }).unknown(true);
export const refreshValidator = Joi.object({ body: Joi.object({ refreshToken: Joi.string().required() }).required() }).unknown(true);