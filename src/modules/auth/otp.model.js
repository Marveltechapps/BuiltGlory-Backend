import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  purpose: { type: String, enum: ["email_verification"], default: "email_verification", index: true },
  otpHash: { type: String, required: true, select: false },
  salt: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0, min: 0 },
  maxAttempts: { type: Number, required: true, default: 5 },
  sentAt: { type: Date },
  resendAvailableAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  usedAt: { type: Date, default: null },
  invalidatedAt: { type: Date, default: null },
  lockedAt: { type: Date, default: null },
  deliveryFailedAt: { type: Date, default: null },
  failureReason: { type: String },
  ip: { type: String },
  userAgent: { type: String }
}, { timestamps: true, collection: "emailOtps" });

otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });
otpSchema.index({ email: 1, purpose: 1, usedAt: 1, invalidatedAt: 1, expiresAt: 1 });

export const EmailOtp = mongoose.models.EmailOtp || mongoose.model("EmailOtp", otpSchema);
