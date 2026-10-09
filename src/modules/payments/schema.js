import mongoose from "mongoose";
import { PAYMENT_STATUSES, PAYMENT_TYPES } from "../../constants/enums.js";
export const collectionName = "payments";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesDeal" },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  type: { type: String, enum: PAYMENT_TYPES, required: true },
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: PAYMENT_STATUSES, default: "created" },
  method: { type: String, enum: ["bank", "upi", "cheque", "cash", "razorpay"], default: "bank" },
  gateway: { type: String, default: "escrow" },
  gatewayOrderId: { type: String, sparse: true, unique: true },
  gatewayPaymentId: { type: String, sparse: true, unique: true },
  gatewaySignature: String,
  providerEventId: { type: String, sparse: true, unique: true },
  providerEventAt: Date,
  idempotencyKey: { type: String, sparse: true, unique: true },
  transactionReference: { type: String, default: "" },
  proofDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  proofUrl: String,
  notes: { type: String, default: "" },
  submittedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  verifiedAt: Date,
  verificationNotes: { type: String, default: "" },
  rejectedAt: Date,
  paidAt: Date,
  failureReason: String,
  providerResponse: mongoose.Schema.Types.Mixed
};
export const configureSchema = (schema) => {
  schema.index({ userId: 1, createdAt: -1 });
  schema.index({ dealId: 1, status: 1 });
};
