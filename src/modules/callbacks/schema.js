import mongoose from "mongoose";
import { CALLBACK_STATUSES } from "../../constants/enums.js";
export const collectionName = "callbacks";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, userType: { type: String, enum: ["buyer", "seller", "nri"] },
  source: { type: String, enum: ["help_support", "profile_support", "property_detail", "payment", "interior"], required: true }, sourceScreen: String, category: { type: String, enum: ["property_inquiry", "pricing", "technical_issue", "complaint", "general", "stage_payment", "interior"] },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" }, reason: String, preferredTime: Date, bestTimePreference: { type: String, enum: ["morning", "afternoon", "evening"] },
  status: { type: String, enum: CALLBACK_STATUSES, default: "pending" }, slaDeadline: { type: Date, required: true }, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, attemptsCount: { type: Number, default: 0 },
  attempts: [{ outcome: { type: String, enum: ["answered", "no_answer", "busy", "wrong_number", "callback_later"] }, notes: String, attemptedAt: Date, attemptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" } }], resolutionNotes: String
};
export const configureSchema = (schema) => { schema.index({ status: 1, slaDeadline: 1 }); schema.index({ assignedTo: 1, status: 1 }); schema.index({ userId: 1, createdAt: -1 }); };