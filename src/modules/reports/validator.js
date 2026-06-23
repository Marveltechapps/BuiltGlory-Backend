import Joi from "joi";

export const summaryValidator = Joi.object({
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso()
  }).unknown(false)
}).unknown(true);

export const exportValidator = Joi.object({
  body: Joi.object({
    filters: Joi.object().default({})
  }).unknown(false)
}).unknown(true);
