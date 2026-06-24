import Joi from "joi";

const mobileNumber = Joi.string().pattern(/^(?!0{10}$)\d{10}$/);
const otp = Joi.string().pattern(/^\d{6}$/).messages({ "string.pattern.base": "OTP must be a 6-digit numeric code." });

export const sendOtpValidator = Joi.object({
  body: Joi.object({
    mobileNumber,
    phone: mobileNumber,
    countryCode: Joi.string().default("+91"),
    deviceId: Joi.string().allow("", null)
  }).or("mobileNumber", "phone").required()
}).unknown(true);

export const verifyOtpValidator = Joi.object({
  body: Joi.object({
    mobileNumber,
    phone: mobileNumber,
    otp,
    enteredOTP: otp
  }).or("mobileNumber", "phone").or("otp", "enteredOTP").required()
}).unknown(true);

export const resendOtpValidator = Joi.object({
  body: Joi.object({
    mobileNumber,
    phone: mobileNumber,
    countryCode: Joi.string().default("+91"),
    deviceId: Joi.string().allow("", null)
  }).or("mobileNumber", "phone").required()
}).unknown(true);
