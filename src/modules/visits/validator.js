import Joi from "joi";
export const idParam = Joi.object({ params: Joi.object({ id: Joi.string().hex().length(24) }).unknown(true) }).unknown(true);
export const listValidator = Joi.object({ query: Joi.object({ page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100), search: Joi.string().max(100), sort: Joi.string().valid("newest", "oldest"), status: Joi.string().valid("scheduled", "confirmed", "completed", "cancelled", "missed", "rescheduled"), assignedAdmin: Joi.string().hex().length(24), buyerId: Joi.string().hex().length(24), propertyId: Joi.string().hex().length(24) }).unknown(false) }).unknown(true);
export const availabilityValidator = Joi.object({ query: Joi.object({ propertyId: Joi.string().hex().length(24).required(), visitType: Joi.string().valid("physical", "virtual").default("physical"), from: Joi.date().iso(), days: Joi.number().integer().min(1).max(30).default(7) }).unknown(false) }).unknown(true);
export const createValidator = Joi.object({ body: Joi.object({ propertyId: Joi.string().hex().length(24).required(), enquiryId: Joi.string().hex().length(24), visitDate: Joi.date().iso().required(), visitTime: Joi.string().max(40).required(), visitType: Joi.string().valid("physical", "virtual").required(), virtualPlatform: Joi.string().valid("zoom", "google_meet", "teams", "whatsapp_video", null), meetingLink: Joi.string().uri().allow("", null) }).unknown(false) }).unknown(true);
export const updateValidator = Joi.object({ body: Joi.object({ visitDate: Joi.date().iso(), visitTime: Joi.string().max(40), reason: Joi.string().max(500).allow("", null), meetingLink: Joi.string().uri().allow("", null), virtualPlatform: Joi.string().valid("zoom", "google_meet", "teams", "whatsapp_video", null), feedback: Joi.object({ buyerInterest: Joi.string().valid("very_interested", "interested", "not_interested", "needs_time").required(), notes: Joi.string().max(2000).required(), nextAction: Joi.string().valid("move_to_negotiation", "schedule_another_visit", "mark_lost", "follow_up").required() }), outcome: Joi.string().max(80), notes: Joi.string().max(2000).allow("", null) }).min(1).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const statusValidator = Joi.object({ body: Joi.object({
  status: Joi.string().valid("scheduled", "confirmed", "completed", "cancelled", "missed", "rescheduled").required(),
  visitDate: Joi.date().iso(),
  visitTime: Joi.string().max(40),
  notes: Joi.string().allow("", null),
  reason: Joi.string().allow("", null),
  cancelReason: Joi.string().allow("", null),
  meetingLink: Joi.string().uri().allow("", null),
  virtualPlatform: Joi.string().valid("zoom", "google_meet", "teams", "whatsapp_video", null),
  assignedAdmin: Joi.string().hex().length(24),
  feedback: Joi.object({
    buyerInterest: Joi.string().valid("very_interested", "interested", "not_interested", "needs_time").required(),
    notes: Joi.string().max(2000).required(),
    nextAction: Joi.string().valid("move_to_negotiation", "schedule_another_visit", "mark_lost", "follow_up").required()
  }),
  virtualRecordingUrl: Joi.string().uri().allow("", null),
  callDuration: Joi.number().integer().min(0).allow(null),
  callNotes: Joi.string().max(2000).allow("", null),
  documentsShared: Joi.array().items(Joi.string().trim().max(160)).max(50),
  followUpAction: Joi.string().max(160).allow("", null),
  followUpDate: Joi.date().iso().allow(null),
  completedAt: Joi.date().iso().allow(null),
  nriChecklist: Joi.object().unknown(true),
  nriAssistanceNotes: Joi.string().max(4000).allow("", null),
  reminderSent: Joi.boolean(),
  callLog: Joi.object({
    outcome: Joi.string().max(80).allow("", null),
    notes: Joi.string().max(2000).allow("", null),
    duration: Joi.number().integer().min(0),
    calledAt: Joi.date().iso()
  }),
  note: Joi.object({
    text: Joi.string().trim().max(2000).required()
  }),
  visitNotes: Joi.array().items(Joi.object({
    text: Joi.string().trim().max(2000).required(),
    createdAt: Joi.date().iso()
  })).max(100)
}).unknown(false), params: Joi.object().unknown(true) }).unknown(true);