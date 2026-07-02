import Joi from "joi";

export const entityTypes = ["buy_enquiry", "sell_request", "acquisition", "sales_deal", "visit", "callback", "interior_lead", "support_ticket", "user", "property"];

export const lockValidator = Joi.object({
  params: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required()
  }).unknown(false),
  body: Joi.object({
    ttlSeconds: Joi.number().integer().min(60).max(3600)
  }).unknown(false)
}).unknown(true);

export const lockParamsValidator = Joi.object({
  params: Joi.object({
    entityType: Joi.string().valid(...entityTypes).required(),
    entityId: Joi.string().hex().length(24).required()
  }).unknown(false)
}).unknown(true);
