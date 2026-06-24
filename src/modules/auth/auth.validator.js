import Joi from "joi";

const email = Joi.string().email({ tlds: { allow: false } }).trim().lowercase().required();
const otp = Joi.string().pattern(/^\d{6}$/).messages({ "string.pattern.base": "OTP must be a 6-digit numeric code." }).required();

export const sendEmailOtpValidator = Joi.object({
  body: Joi.object({ email }).required()
}).unknown(true);

export const resendEmailOtpValidator = Joi.object({
  body: Joi.object({ email }).required()
}).unknown(true);

export const verifyEmailOtpValidator = Joi.object({
  body: Joi.object({
    email,
    otp,
    requestId: Joi.string().trim().allow("", null)
  }).required()
}).unknown(true);
