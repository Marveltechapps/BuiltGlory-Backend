import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { User } from "../users/model.js";
import { makeReferenceId } from "../../shared/id.js";
import { badRequest } from "../../shared/errors/AppError.js";
import { sendOtpViaSmsVendor } from "../../services/smsVendor.service.js";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_DIGITS = 6;

const mobileQuery = (mobileNumber) => ({
  $or: [
    { mobileNumber },
    { phoneNormalized: `91${mobileNumber}` },
    { phone: mobileNumber },
    { phone: `+91 ${mobileNumber}` }
  ]
});

export const generateOTP = () => String(crypto.randomInt(10 ** (OTP_DIGITS - 1), 10 ** OTP_DIGITS));

const findUserByMobileNumber = (mobileNumber) => User.findOne(mobileQuery(mobileNumber));

const findOrCreateUser = async (mobileNumber) => {
  const user = await findUserByMobileNumber(mobileNumber);
  if (user) return user;
  return User.create({
    referenceId: makeReferenceId("users"),
    mobileNumber,
    phone: `+91 ${mobileNumber}`,
    phoneNormalized: `91${mobileNumber}`,
    role: "buyer",
    userType: "resident",
    registeredAt: new Date()
  });
};

const issueOtpToken = (user) => jwt.sign(
  { sub: String(user._id), type: "customer", role: user.role, userType: user.userType },
  env.JWT_ACCESS_SECRET,
  { expiresIn: "4w", issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE }
);

export const sendOtp = async ({ mobileNumber }) => {
  const user = await findOrCreateUser(mobileNumber);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await sendOtpViaSmsVendor({ mobileNumber, otp });
  user.mobileNumber = mobileNumber;
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();
  return { message: "OTP sent successfully" };
};

export const verifyOtp = async ({ mobileNumber, otp, enteredOTP }) => {
  const user = await findUserByMobileNumber(mobileNumber);
  const suppliedOtp = otp ?? enteredOTP;
  if (!user) throw badRequest("User not found");
  if (!user.otp) throw badRequest("No OTP found. Please request a new OTP.");
  if (!user.otpExpiry || new Date() > new Date(user.otpExpiry)) throw badRequest("OTP expired");
  if (String(user.otp).trim() !== String(suppliedOtp).trim()) throw badRequest("Incorrect OTP");

  user.otp = null;
  user.otpExpiry = null;
  user.isVerified = true;
  user.lastLoginAt = new Date();
  await user.save();

  return {
    message: "OTP verified successfully",
    userId: String(user._id),
    token: issueOtpToken(user),
    isVerified: user.isVerified,
    name: user.name || null
  };
};

export const resendOtp = async ({ mobileNumber }) => {
  const user = await findUserByMobileNumber(mobileNumber);
  if (!user) throw badRequest("User not found");

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await sendOtpViaSmsVendor({ mobileNumber, otp });
  user.mobileNumber = mobileNumber;
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();
  return { message: "OTP resent successfully" };
};
