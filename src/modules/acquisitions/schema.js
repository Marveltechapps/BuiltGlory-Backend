import mongoose from "mongoose";
import { ACQUISITION_STAGES } from "../../constants/enums.js";
export const collectionName = "acquisitions";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, stage: { type: String, enum: ACQUISITION_STAGES, default: "pending_review" }, createdFrom: { type: String, enum: ["sell_request", "manual"], default: "sell_request" },
  sellRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "SellRequest" }, sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, sellerSnapshot: mongoose.Schema.Types.Mixed,
  propertyTitle: String, propertyType: String, propertyLocation: String, propertyCity: String, askingPrice: Number, builtgloryOffer: Number, agreedPrice: Number, finalPurchasePrice: Number,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" }, daysInStage: { type: Number, default: 0 }, lastActivityAt: Date,
  photos: [String], media: mongoose.Schema.Types.Mixed, propertyDetails: mongoose.Schema.Types.Mixed, valuation: mongoose.Schema.Types.Mixed, negotiation: mongoose.Schema.Types.Mixed, token: mongoose.Schema.Types.Mixed, documentation: mongoose.Schema.Types.Mixed, payout: mongoose.Schema.Types.Mixed,
  rejectionReason: String, onHoldReason: String, stageHistory: [{ from: String, to: String, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, changedAt: Date, notes: String }]
};
export const configureSchema = (schema) => { schema.index({ stage: 1, priority: 1, assignedTo: 1 }); schema.index({ sellRequestId: 1 }); schema.index({ lastActivityAt: -1 }); };