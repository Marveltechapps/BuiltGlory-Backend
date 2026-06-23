import mongoose from "mongoose";
import { SELL_REQUEST_STATUSES } from "../../constants/enums.js";
export const collectionName = "sellRequests";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sellerSnapshot: { name: String, phone: String, email: String, userType: String, kycStatus: String }, propertyTitle: String, propertyType: String, askingPrice: { type: Number, min: 0 }, negotiable: Boolean,
  address: { street: String, locality: String, city: String, state: String, pincode: String, landmark: String, latitude: Number, longitude: Number },
  ownershipType: String, possessionStatus: String, loanOnProperty: Boolean, loanDetails: mongoose.Schema.Types.Mixed, photos: [String], photosCount: { type: Number, default: 0 }, documentsCount: { type: Number, default: 0 }, completenessPercent: { type: Number, default: 0 },
  description: String, amenities: [String], specifications: mongoose.Schema.Types.Mixed, documents: [{ name: String, status: { type: String, enum: ["uploaded", "missing", "pending"], default: "uploaded" }, fileUrl: String }],
  status: { type: String, enum: SELL_REQUEST_STATUSES, default: "new" }, isDraft: { type: Boolean, default: false }, draftStep: Number, draftSavedAt: Date,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, rejectionReason: String, pauseReason: String, changeRequests: [String],
  metrics: { views: { type: Number, default: 0 }, enquiryCount: { type: Number, default: 0 }, visitCount: { type: Number, default: 0 }, saveCount: { type: Number, default: 0 }, viewsThisWeek: [Number] },
  sale: { salePrice: Number, saleDate: Date, buyerName: String }, submittedAt: Date
};
export const configureSchema = (schema) => { schema.index({ sellerId: 1, status: 1 }); schema.index({ status: 1, assignedTo: 1, submittedAt: -1 }); schema.index({ "address.city": 1, propertyType: 1 }); };