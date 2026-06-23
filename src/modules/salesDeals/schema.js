import mongoose from "mongoose";
import { SALES_DEAL_STAGES } from "../../constants/enums.js";
export const collectionName = "salesDeals";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, stage: { type: String, enum: SALES_DEAL_STAGES, default: "active_leads" }, priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, buyerSnapshot: mongoose.Schema.Types.Mixed, propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true }, propertySnapshot: mongoose.Schema.Types.Mixed,
  financials: { offeredPrice: Number, agreedPrice: Number, tokenAmount: Number, tokenPaid: { type: Boolean, default: false }, paymentType: { type: String, enum: ["full", "stage", null], default: null }, totalPaid: { type: Number, default: 0 } },
  daysInStage: { type: Number, default: 0 }, lastActivityAt: Date, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, sourceEnquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "BuyEnquiry" }, lostReason: String, closedAt: Date,
  reengagement: { followUpAt: Date, lastContactAt: Date, attempts: { type: Number, default: 0 } }, photos: [String], stageHistory: [{ from: String, to: String, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, changedAt: Date, notes: String }]
};
export const configureSchema = (schema) => { schema.index({ stage: 1, priority: 1, assignedTo: 1 }); schema.index({ buyerId: 1, createdAt: -1 }); schema.index({ propertyId: 1, stage: 1 }); schema.index({ sourceEnquiryId: 1 }); };