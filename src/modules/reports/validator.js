import Joi from "joi";

const scheduleBody = {
  name: Joi.string().trim().min(2).max(120).required(),
  reportType: Joi.string().valid("overview", "sales", "acquisition", "revenue", "users", "properties").required(),
  format: Joi.string().valid("csv", "xlsx", "pdf").default("xlsx"),
  frequency: Joi.string().valid("daily", "weekly", "monthly").required(),
  timezone: Joi.string().trim().max(80).default("Asia/Kolkata"),
  filters: Joi.object().default({}),
  recipients: Joi.array().items(Joi.string().email()).min(1).max(25).required(),
  nextRunAt: Joi.date().iso()
};

export const summaryValidator = Joi.object({
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso()
  }).unknown(false)
}).unknown(true);

export const analyticsValidator = Joi.object({
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    propertyType: Joi.string().max(80)
  }).unknown(false)
}).unknown(true);

export const exportValidator = Joi.object({
  body: Joi.object({
    filters: Joi.object({
      reportType: Joi.string().valid("properties", "users", "sales", "sales_deals", "acquisitions").default("properties"),
      format: Joi.string().valid("csv", "xlsx", "excel", "pdf").default("xlsx"),
      fields: Joi.array().items(Joi.string().max(80)).max(50),
      from: Joi.date().iso(),
      to: Joi.date().iso(),
      estimatedRows: Joi.number().integer().min(0),
      deliveryEmail: Joi.string().email().allow("", null),
      limit: Joi.number().integer().min(1).max(50000)
    }).default({})
  }).unknown(false)
}).unknown(true);

export const exportListValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string().valid("queued", "processing", "completed", "failed", "expired")
  }).unknown(false)
}).unknown(true);

export const exportIdValidator = Joi.object({
  params: Joi.object({
    id: Joi.string().max(80).required()
  }).unknown(false)
}).unknown(true);

export const exportDownloadValidator = Joi.object({
  params: Joi.object({
    id: Joi.string().max(80).required()
  }).unknown(false),
  query: Joi.object({
    token: Joi.string().max(160).required()
  }).unknown(false)
}).unknown(true);

export const scheduleValidator = Joi.object({
  body: Joi.object(scheduleBody).unknown(false)
}).unknown(true);

export const scheduleListValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string().valid("active", "paused"),
    reportType: Joi.string().valid("overview", "sales", "acquisition", "revenue", "users", "properties")
  }).unknown(false)
}).unknown(true);
