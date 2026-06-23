import mongoose from "mongoose";
import { VISIT_STATUSES } from "../../constants/enums.js";
export const collectionName = "visits";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true }, buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true }, enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "BuyEnquiry" },
  visitDate: { type: Date, required: true }, visitTime: String, visitType: { type: String, enum: ["physical", "virtual"], required: true }, virtualPlatform: { type: String, enum: ["zoom", "google_meet", "teams", "whatsapp_video", null], default: null }, meetingLink: String,
  status: { type: String, enum: VISIT_STATUSES, default: "scheduled" }, assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, rescheduleCount: { type: Number, default: 0 }, rescheduleHistory: [{ previousDate: Date, previousTime: String, newDate: Date, newTime: String, reason: String, actorType: String, actorId: mongoose.Schema.Types.ObjectId, changedAt: Date }],
  feedback: { buyerInterest: { type: String, enum: ["very_interested", "interested", "not_interested", "needs_time", null], default: null }, notes: String, nextAction: { type: String, enum: ["move_to_negotiation", "schedule_another_visit", "mark_lost", "follow_up", null], default: null }, completedAt: Date },
  callLogs: [{ outcome: String, notes: String, calledAt: Date, calledBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" } }]
};
export const configureSchema = (schema) => { schema.index({ visitDate: 1, status: 1, assignedAdmin: 1 }); schema.index({ buyerId: 1, visitDate: -1 }); schema.index({ propertyId: 1, visitDate: -1 }); };