import mongoose from "mongoose";
import { BUY_ENQUIRY_STATUSES } from "../../constants/enums.js";
export const collectionName = "buyEnquiries";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyerSnapshot: { name: String, phone: String, email: String, userType: String }, propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  propertySnapshot: { title: String, price: Number, type: { type: String }, location: String }, enquiryTypes: [String], preferredContact: { type: String, enum: ["phone", "whatsapp", "email"], required: true },
  interestType: { type: String, enum: ["schedule_visit", "price_negotiation", "more_details"], required: true }, preferredVisitTime: { type: String, enum: ["tomorrow_morning", "tomorrow_afternoon", "this_weekend_morning", "this_weekend_afternoon", "custom", null], default: null },
  preferredVisitDate: Date, preferredVisitTimeSlot: String, additionalMessage: { type: String, maxlength: 1000 },
  status: { type: String, enum: BUY_ENQUIRY_STATUSES, default: "new" }, source: { type: String, default: "app" }, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "BuyEnquiry" }, submittedAt: { type: Date, default: Date.now }
};
export const configureSchema = (schema) => { schema.index({ propertyId: 1, buyerId: 1, submittedAt: -1 }); schema.index({ status: 1, assignedTo: 1 }); schema.index({ submittedAt: -1 }); };