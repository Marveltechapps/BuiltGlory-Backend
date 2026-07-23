import Joi from "joi";
export const idParam = Joi.object({ params: Joi.object({ id: Joi.string().hex().length(24) }).unknown(true) }).unknown(true);
export const listValidator = Joi.object({ query: Joi.object({ page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100), search: Joi.string().max(100), sort: Joi.string().max(40), status: Joi.string().valid("unread", "read"), isRead: Joi.boolean() }).unknown(true) }).unknown(true);
export const createValidator = Joi.object({ body: Joi.object().min(1).unknown(true) }).unknown(true);
export const updateValidator = Joi.object({ body: Joi.object().min(1).unknown(true), params: Joi.object().unknown(true) }).unknown(true);
export const statusValidator = Joi.object({ body: Joi.object({ status: Joi.string(), stage: Joi.string(), decision: Joi.string(), notes: Joi.string().allow("", null), reason: Joi.string().allow("", null) }).unknown(true), params: Joi.object().unknown(true) }).unknown(true);
export const markReadValidator = Joi.object({
  body: Joi.object({
    ids: Joi.array().items(Joi.string().hex().length(24)).max(100)
  }).unknown(false),
  params: Joi.object({
    id: Joi.string().hex().length(24)
  }).unknown(true)
}).unknown(true);
export const sendPushValidator = Joi.object({
  body: Joi.object({
    userId: Joi.string().hex().length(24).required(),
    audience: Joi.string().valid("buyer", "seller").default("buyer"),
    notificationType: Joi.string().max(80),
    title: Joi.string().max(200).required(),
    message: Joi.string().max(2000).required(),
    screen: Joi.string().max(40),
    screenKey: Joi.string().max(80),
    listingId: Joi.string().allow("", null),
    enquiryId: Joi.string().allow("", null),
    dealId: Joi.string().allow("", null),
    propertyId: Joi.string().allow("", null),
    entityId: Joi.string().allow("", null),
    entityType: Joi.string().max(80),
    deepLink: Joi.string().max(80),
    image: Joi.string().allow("", null),
    dedupeKey: Joi.string().max(200)
  }).unknown(false)
}).unknown(true);