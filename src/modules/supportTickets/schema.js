import mongoose from "mongoose";
import { SUPPORT_TICKET_STATUSES } from "../../constants/enums.js";

export const collectionName = "supportTickets";

export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: {
    type: String,
    enum: ["property_inquiry", "payment", "technical", "kyc", "general", "complaint"],
    required: true
  },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: SUPPORT_TICKET_STATUSES, default: "open" },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  channel: { type: String, enum: ["ticket", "live_chat"], default: "ticket", index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  escalation: {
    targetAssignee: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    reason: String,
    escalatedAt: Date
  },
  slaDeadline: Date,
  attachments: [String],
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date },
  unreadCustomerCount: { type: Number, default: 0, min: 0 },
  unreadAgentCount: { type: Number, default: 0, min: 0 },
  responses: [
    {
      message: { type: String, required: true },
      responderType: { type: String, enum: ["admin", "customer", "system"], required: true },
      responderId: { type: mongoose.Schema.Types.ObjectId },
      clientMessageId: { type: String },
      readAt: { type: Date },
      createdAt: { type: Date, default: Date.now }
    }
  ]
};

export const configureSchema = (schema) => {
  schema.index({ status: 1, priority: 1, assignedTo: 1 });
  schema.index({ userId: 1, createdAt: -1 });
  schema.index({ userId: 1, status: 1, channel: 1 });
  schema.index({ channel: 1, status: 1, lastMessageAt: -1 });
  schema.index({ createdAt: -1 });
  schema.index({ "responses.clientMessageId": 1 }, { sparse: true });
};
