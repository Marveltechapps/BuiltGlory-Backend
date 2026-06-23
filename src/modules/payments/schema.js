import mongoose from "mongoose";
import { PAYMENT_STATUSES, PAYMENT_TYPES } from "../../constants/enums.js";
export const collectionName = "payments";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, dealId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesDeal" }, propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  type: { type: String, enum: PAYMENT_TYPES, required: true }, amount: { type: Number, min: 0, required: true }, currency: { type: String, default: "INR" }, status: { type: String, enum: PAYMENT_STATUSES, default: "created" },
  gateway: { type: String, default: "razorpay" }, gatewayOrderId: { type: String, sparse: true, unique: true }, gatewayPaymentId: { type: String, sparse: true, unique: true }, gatewaySignature: String, providerEventId: { type: String, sparse: true, unique: true }, providerEventAt: Date, idempotencyKey: { type: String, sparse: true, unique: true }, paidAt: Date, failureReason: String, providerResponse: mongoose.Schema.Types.Mixed
};
export const configureSchema = (schema) => { schema.index({ userId: 1, createdAt: -1 }); schema.index({ dealId: 1, status: 1 }); };