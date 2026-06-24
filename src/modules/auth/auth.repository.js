import { EmailOtp } from "./otp.model.js";
import { User } from "../users/model.js";

const emailOtpPurpose = "email_verification";

const withSecrets = (query, includeSecrets) => includeSecrets ? query.select("+otpHash +salt") : query;

export const repository = {
  createEmailOtp: (payload) => EmailOtp.create({ ...payload, purpose: emailOtpPurpose }),

  findLatestActiveEmailOtp: ({ email, includeSecrets = false }) => withSecrets(EmailOtp.findOne({
    email,
    purpose: emailOtpPurpose,
    usedAt: null,
    invalidatedAt: null,
    deliveryFailedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 }), includeSecrets),

  findActiveEmailOtpByRequestId: ({ email, requestId, includeSecrets = false }) => withSecrets(EmailOtp.findOne({
    email,
    requestId,
    purpose: emailOtpPurpose,
    usedAt: null,
    invalidatedAt: null,
    deliveryFailedAt: null,
    expiresAt: { $gt: new Date() }
  }), includeSecrets),

  invalidateActiveEmailOtps: ({ email }) => EmailOtp.updateMany({
    email,
    purpose: emailOtpPurpose,
    usedAt: null,
    invalidatedAt: null,
    expiresAt: { $gt: new Date() }
  }, { $set: { invalidatedAt: new Date() } }),

  markEmailOtpSent: (id) => EmailOtp.findByIdAndUpdate(id, { sentAt: new Date() }, { returnDocument: "after" }),

  markEmailOtpDeliveryFailed: (id, failureReason) => EmailOtp.findByIdAndUpdate(id, {
    deliveryFailedAt: new Date(),
    failureReason: String(failureReason || "Email delivery failed").slice(0, 500)
  }, { returnDocument: "after" }),

  saveEmailOtp: (otpRecord) => otpRecord.save(),

  findUserByEmail: (email) => User.findOne({ email }),

  upsertVerifiedEmailUser: ({ email, referenceId }) => User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        referenceId,
        email,
        role: "buyer",
        userType: "resident",
        registeredAt: new Date()
      },
      $set: {
        isVerified: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date()
      }
    },
    { upsert: true, returnDocument: "after" }
  )
};
