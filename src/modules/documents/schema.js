import mongoose from "mongoose";
import { DOCUMENT_STATUSES } from "../../constants/enums.js";
export const collectionName = "documents";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, ownerType: { type: String, enum: ["user", "property", "sell_request", "acquisition", "sales_deal", "support_ticket", "payment"], required: true }, ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  purpose: { type: String, enum: ["kyc", "legal", "property_media", "payment_proof", "support_attachment"], required: true }, documentType: String, fileName: String, mimeType: String, sizeBytes: Number, storageKey: String, url: String,
  status: { type: String, enum: DOCUMENT_STATUSES, default: "uploaded" }, uploadedBy: mongoose.Schema.Types.ObjectId, verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, verifiedAt: Date, rejectionReason: String, scanStatus: { type: String, enum: ["pending", "clean", "infected", "failed"], default: "pending" }, isPrivate: { type: Boolean, default: true }
};
export const configureSchema = (schema) => { schema.index({ ownerType: 1, ownerId: 1, purpose: 1 }); schema.index({ status: 1, documentType: 1 }); };