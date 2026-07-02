import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["queued", "scheduled", "sent", "partial", "failed"], default: "queued", index: true },
    channel: { type: String, enum: ["whatsapp", "email", "sms", "in_app", "all"], required: true },
    audience: { type: String, default: "all", index: true },
    title: { type: String, trim: true },
    message: { type: String, required: true },
    templateId: { type: String },
    recipients: [{ type: String }],
    queuedCount: { type: Number, default: 0 },
    notificationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
    scheduledAt: Date,
    sentAt: Date,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", index: true },
    failureReason: String
  },
  {
    timestamps: true,
    collection: "bulkMessages",
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.index({ createdAt: -1 });

export const BulkMessage = mongoose.models.BulkMessage || mongoose.model("BulkMessage", schema);
