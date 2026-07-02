import Joi from "joi";

export const listValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(100),
    sort: Joi.string().valid("newest", "oldest"),
    status: Joi.string().valid("new", "reviewed", "archived"),
    userId: Joi.string().hex().length(24),
  }).unknown(false),
}).unknown(true);

export const createValidator = Joi.object({
  body: Joi.object({
    message: Joi.string().max(5000).required(),
    source: Joi.string().max(80),
    sourceScreen: Joi.string().max(80),
    metadata: Joi.object().unknown(true),
  }).unknown(false),
}).unknown(true);

export const updateValidator = Joi.object({
  body: Joi.object({
    status: Joi.string().valid("new", "reviewed", "archived").required(),
  }).unknown(false),
  params: Joi.object().unknown(true),
}).unknown(true);
