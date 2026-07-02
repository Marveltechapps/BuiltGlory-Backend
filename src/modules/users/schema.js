import mongoose from "mongoose";
import { USER_TYPES, CUSTOMER_ROLES, KYC_STATUSES, FEMA_STATUSES, DOCUMENT_STATUSES } from "../../constants/enums.js";
const kycDocumentSchema = new mongoose.Schema({ name: String, type: String, status: { type: String, enum: DOCUMENT_STATUSES, default: "uploaded" }, fileUrl: String, uploadedAt: Date, verifiedAt: Date, verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, rejectionReason: String }, { _id: true });
export const collectionName = "users";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, minlength: 2, trim: true },
  mobileNumber: { type: String, match: /^\d{10}$/, sparse: true, unique: true, index: true },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerifiedAt: Date,
  phone: { type: String },
  phoneNormalized: { type: String, sparse: true, unique: true, index: true },
  email: { type: String, lowercase: true, sparse: true, unique: true },
  userType: { type: String, enum: USER_TYPES, default: "resident" },
  role: { type: String, enum: CUSTOMER_ROLES, default: "buyer" },
  profilePhoto: String, city: String, state: String, country: { type: String, default: "India" }, latitude: Number, longitude: Number,
  bankDetails: { accountHolderName: String, bankName: String, accountNumberLast4: String, ifsc: String, branch: String, upiId: String, updatedAt: Date },
  kycStatus: { type: String, enum: KYC_STATUSES, default: "not_submitted" },
  kycDocuments: [kycDocumentSchema], kycSubmittedAt: Date, kycVerifiedAt: Date, kycRejectionReason: String,
  femaCompliance: { status: { type: String, enum: FEMA_STATUSES, default: "not_checked" }, checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, checkedAt: Date, notes: String },
  notificationPreferences: {
    sms: { transactional: { type: Boolean, default: true }, marketing: { type: Boolean, default: false }, optedOutAt: Date },
    whatsapp: { transactional: { type: Boolean, default: true }, marketing: { type: Boolean, default: false }, optedOutAt: Date },
    email: { transactional: { type: Boolean, default: true }, marketing: { type: Boolean, default: false }, optedOutAt: Date },
    push: { transactional: { type: Boolean, default: true }, marketing: { type: Boolean, default: false }, optedOutAt: Date },
    in_app: { transactional: { type: Boolean, default: true }, marketing: { type: Boolean, default: false }, optedOutAt: Date },
    unsubscribeToken: String
  },
  pushDevices: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ["android", "ios", "web"], default: "android" },
    deviceId: String,
    updatedAt: { type: Date, default: Date.now }
  }],
  accountDeletion: {
    status: { type: String, enum: ["none", "requested", "cancelled", "completed"], default: "none" },
    reason: { type: String, maxlength: 1000 },
    verificationStatus: { type: String, enum: ["not_started", "pending", "verified", "failed"], default: "not_started" },
    requestedAt: Date,
    scheduledDeletionAt: Date,
    cancelledAt: Date,
    completedAt: Date,
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  totalEnquiries: { type: Number, default: 0 }, totalVisits: { type: Number, default: 0 }, totalDeals: { type: Number, default: 0 }, totalListings: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now }, lastLoginAt: Date, isActive: { type: Boolean, default: true }, isBlocked: { type: Boolean, default: false }, blockedReason: String, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
};
export const configureSchema = (schema) => {
  schema.index({ role: 1, userType: 1, kycStatus: 1 });
  schema.index({ isBlocked: 1, isActive: 1 });
  schema.index({ name: "text", phone: "text", email: "text", referenceId: "text" });
  schema.virtual("profileComplete").get(function () { return Boolean(this.name && this.phoneNormalized && this.role && this.userType); });
};