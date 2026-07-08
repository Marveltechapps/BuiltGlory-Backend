import Joi from "joi";

export const entityTypes = ["buy_enquiry", "sell_request", "acquisition", "sales_deal", "visit", "callback", "interior_lead", "support_ticket", "user", "property"];
export const channels = ["call", "note", "message", "push", "email", "whatsapp", "proof_upload"];

const attachmentSchema = Joi.object({
  fileName: Joi.string().max(255).allow("", null),
  url: Joi.string().uri().required(),
  mimeType: Joi.string().max(120).allow("", null),
  sizeBytes: Joi.number().integer().min(0),
  storageKey: Joi.string().max(500).allow("", null)
});

export const createValidator = Joi.object({
  body: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required(),
    channel: Joi.string().valid(...channels).required(),
    direction: Joi.string().valid("inbound", "outbound", "internal").default("internal"),
    summary: Joi.string().trim().min(1).max(300).required(),
    body: Joi.string().trim().max(5000).allow("", null),
    outcome: Joi.string().trim().max(120).allow("", null),
    durationMinutes: Joi.number().min(0).max(1440),
    followUpAt: Joi.date().iso().allow(null),
    occurredAt: Joi.date().iso(),
    attachments: Joi.array().items(attachmentSchema).max(10).default([])
  }).unknown(false)
}).unknown(true);

export const createForEntityValidator = Joi.object({
  params: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required()
  }).unknown(false),
  body: Joi.object({
    channel: Joi.string().valid(...channels).required(),
    direction: Joi.string().valid("inbound", "outbound", "internal").default("internal"),
    summary: Joi.string().trim().min(1).max(300).required(),
    body: Joi.string().trim().max(5000).allow("", null),
    outcome: Joi.string().trim().max(120).allow("", null),
    durationMinutes: Joi.number().min(0).max(1440),
    followUpAt: Joi.date().iso().allow(null),
    occurredAt: Joi.date().iso(),
    attachments: Joi.array().items(attachmentSchema).max(10).default([])
  }).unknown(false)
}).unknown(true);

export const listValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    entityType: Joi.string().valid(...entityTypes),
    entityId: Joi.string().hex().length(24),
    channel: Joi.alternatives().try(
      Joi.string().valid(...channels),
      Joi.array().items(Joi.string().valid(...channels)).max(channels.length)
    ),
    direction: Joi.string().valid("inbound", "outbound", "internal"),
    search: Joi.string().trim().max(120)
  }).unknown(false)
}).unknown(true);

export const pushValidator = Joi.object({
  params: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required()
  }).unknown(false),
  body: Joi.object({
    userId: Joi.string().hex().length(24).allow("", null),
    recipient: Joi.string().trim().max(160).allow("", null),
    notificationId: Joi.string().trim().max(80).required(),
    audience: Joi.string().valid("buyer", "seller").default("buyer"),
    image: Joi.string().uri().allow("", null),
    template: Joi.object({
      title: Joi.string().trim().min(1).max(160).required(),
      body: Joi.string().trim().min(1).max(2000).required(),
      deepLink: Joi.string().trim().max(300).allow("", null)
    }).required(),
    dedupeKey: Joi.string().trim().max(300).allow("", null),
    skipDuplicateCheck: Joi.boolean()
  }).unknown(false)
}).unknown(true);

export const emailValidator = Joi.object({
  params: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required()
  }).unknown(false),
  body: Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().trim().min(1).max(200).required(),
    body: Joi.string().trim().min(1).max(5000).required(),
    summary: Joi.string().trim().max(300).allow("", null),
    from: Joi.string().email().allow("", null)
  }).unknown(false)
}).unknown(true);

export const timelineValidator = Joi.object({
  params: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required()
  }).unknown(false),
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    channel: Joi.string().valid(...channels)
  }).unknown(false)
}).unknown(true);
