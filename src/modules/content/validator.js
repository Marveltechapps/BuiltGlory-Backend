import Joi from "joi";
import { CONTENT_SECTIONS, CONTENT_STATUSES } from "./schema.js";

const contentBody = {
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  section: Joi.string().valid(...CONTENT_SECTIONS),
  title: Joi.string().trim().max(180),
  excerpt: Joi.string().trim().allow("", null).max(500),
  body: Joi.string().allow("", null).max(30000),
  category: Joi.string().trim().allow("", null).max(80),
  status: Joi.string().valid(...CONTENT_STATUSES),
  imageUrl: Joi.string().uri().allow("", null),
  cta: Joi.object({
    label: Joi.string().trim().allow("", null).max(80),
    target: Joi.string().trim().allow("", null).max(300)
  }).allow(null),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
  order: Joi.number().integer().min(0).max(10000),
  metadata: Joi.object().unknown(true),
  publishedAt: Joi.date().iso().allow(null)
};

export const publicListValidator = Joi.object({
  query: Joi.object({
    section: Joi.string().valid(...CONTENT_SECTIONS),
    category: Joi.string().trim().max(80),
    search: Joi.string().trim().max(100),
    limit: Joi.number().integer().min(1).max(100)
  }).unknown(true)
}).unknown(true);

export const listValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    section: Joi.string().valid(...CONTENT_SECTIONS),
    category: Joi.string().trim().max(80),
    status: Joi.string().valid(...CONTENT_STATUSES),
    search: Joi.string().trim().max(100),
    sort: Joi.string().valid("newest", "oldest")
  }).unknown(true)
}).unknown(true);

export const createValidator = Joi.object({
  body: Joi.object({
    ...contentBody,
    section: contentBody.section.required(),
    title: contentBody.title.required()
  }).unknown(false)
}).unknown(true);

export const updateValidator = Joi.object({
  params: Joi.object({ contentId: Joi.string().hex().length(24).required() }).unknown(true),
  body: Joi.object(contentBody).min(1).unknown(false)
}).unknown(true);

export const reorderValidator = Joi.object({
  body: Joi.object({
    items: Joi.array().items(Joi.object({
      id: Joi.string().hex().length(24).required(),
      order: Joi.number().integer().min(0).max(10000).required()
    })).min(1).required()
  }).unknown(false)
}).unknown(true);
