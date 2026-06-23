import mongoose from "mongoose";
import { CHAT_STATUSES } from "../../constants/enums.js";
export const collectionName = "chatThreads";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true }, dealId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesDeal" },
  status: { type: String, enum: CHAT_STATUSES, default: "active" }, negotiation: { agreedPrice: Number, deadline: Date, summary: String, deadlineAlertAt: Date, longNegotiationAlert: { type: Boolean, default: false } }, lastMessageAt: Date,
  messages: [{ sender: { type: String, enum: ["buyer", "admin"] }, senderId: mongoose.Schema.Types.ObjectId, type: { type: String, enum: ["text", "offer", "deal_agreed"] }, text: String, offerAmount: Number, offerStatus: { type: String, enum: ["pending", "accepted", "countered", "declined"] }, createdAt: Date }],
  offerHistory: [{ messageId: mongoose.Schema.Types.ObjectId, action: String, amount: Number, actorId: mongoose.Schema.Types.ObjectId, actedAt: Date }],
  timeline: [{ event: String, messageId: mongoose.Schema.Types.ObjectId, actorId: mongoose.Schema.Types.ObjectId, amount: Number, createdAt: Date }]
};
export const configureSchema = (schema) => { schema.index({ buyerId: 1, propertyId: 1, status: 1 }); schema.index({ lastMessageAt: -1 }); schema.index({ status: 1, "negotiation.deadline": 1 }); };