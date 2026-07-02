import Joi from "joi";

export const searchValidator = Joi.object({
  query: Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(20)
  }).unknown(false)
}).unknown(true);
