import mongoose from "mongoose";
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from "../../constants/enums.js";
export const collectionName = "notifications";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  event: { type: String, required: true }, channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true }, status: { type: String, enum: NOTIFICATION_STATUSES, default: "queued" },
  recipient: String, templateId: String, payload: mongoose.Schema.Types.Mixed, provider: String, providerMessageId: String, providerResponse: mongoose.Schema.Types.Mixed, attempts: { type: Number, default: 0 }, maxAttempts: { type: Number, default: 5 }, nextAttemptAt: Date, sentAt: Date, deliveredAt: Date, failedAt: Date, deadLetterAt: Date, failureReason: String, marketing: { type: Boolean, default: false }, preferenceCheckedAt: Date
};
export const configureSchema = (schema) => { schema.index({ status: 1, nextAttemptAt: 1 }); schema.index({ userId: 1, createdAt: -1 }); schema.index({ event: 1, channel: 1 }); };