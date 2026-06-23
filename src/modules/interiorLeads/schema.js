import mongoose from "mongoose";
import { INTERIOR_LEAD_STATUSES, USER_TYPES } from "../../constants/enums.js";
export const collectionName = "interiorLeads";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  selectedRooms: [String], designStyle: { type: String, enum: ["modern", "classic", "contemporary", "minimalist"], required: true }, budgetRange: { type: String, enum: ["budget", "standard", "premium", "luxury"], required: true }, userType: { type: String, enum: USER_TYPES },
  status: { type: String, enum: INTERIOR_LEAD_STATUSES, default: "new" }, slaDeadline: { type: Date, required: true }, assignedDesigner: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, quote: { amount: Number, packageName: String, timeline: String, inclusions: [String], validUntil: Date }, customerAcceptedAt: Date, completionNote: String, remoteCoordinationNotes: String, notes: String
};
export const configureSchema = (schema) => { schema.index({ status: 1, slaDeadline: 1 }); schema.index({ assignedDesigner: 1, status: 1 }); schema.index({ buyerId: 1, createdAt: -1 }); };