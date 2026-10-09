import Joi from "joi";
export const idParam = Joi.object({ params: Joi.object({ id: Joi.string().hex().length(24) }).unknown(true) }).unknown(true);
export const listValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().max(100),
    sort: Joi.string().valid("newest", "oldest"),
    status: Joi.string().valid("created", "pending", "paid", "failed", "refunded", "cancelled", "rejected"),
    type: Joi.string().valid("token", "full", "stage", "seller_payout", "refund"),
    dealId: Joi.string().hex().length(24),
    method: Joi.string().valid("bank", "upi", "cheque", "cash", "razorpay")
  }).unknown(false)
}).unknown(true);
export const createValidator = Joi.object({
  body: Joi.object({
    dealId: Joi.string().hex().length(24).required(),
    propertyId: Joi.string().hex().length(24),
    type: Joi.string().valid("token").default("token"),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid("INR").default("INR"),
    method: Joi.string().valid("bank", "upi", "cheque", "cash").default("bank"),
    transactionReference: Joi.string().trim().max(80).allow("", null),
    proofDocumentId: Joi.string().hex().length(24).allow("", null),
    notes: Joi.string().trim().max(1000).allow("", null),
    idempotencyKey: Joi.string().max(120)
  }).unknown(false)
}).unknown(true);
export const verifyValidator = Joi.object({
  params: Joi.object({ paymentId: Joi.string().hex().length(24).required() }).unknown(true),
  body: Joi.object({
    decision: Joi.string().valid("paid", "rejected").required(),
    notes: Joi.string().trim().max(1000).allow("", null)
  }).unknown(false)
}).unknown(true);
export const updateValidator = Joi.object({ body: Joi.object().min(1).unknown(true), params: Joi.object().unknown(true) }).unknown(true);
export const statusValidator = Joi.object({ body: Joi.object({ status: Joi.string(), stage: Joi.string(), decision: Joi.string(), notes: Joi.string().allow("", null), reason: Joi.string().allow("", null) }).unknown(true), params: Joi.object().unknown(true) }).unknown(true);
