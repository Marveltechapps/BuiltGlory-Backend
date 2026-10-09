import Joi from "joi";
import { SALES_DEAL_STAGES } from "../../constants/enums.js";

const objectId = Joi.string().hex().length(24);
const optionalText = (max, min = 1) => Joi.string().trim().min(min).max(max).allow("", null);
const positiveAmount = Joi.number().positive().max(1e12);
const nonNegativeAmount = Joi.number().min(0).max(1e12);

export const idParam = Joi.object({ params: Joi.object({ id: objectId, dealId: objectId }).unknown(true) }).unknown(true);

export const listValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().trim().max(100).allow(""),
    sort: Joi.string().valid("newest", "oldest", "price_asc", "price_desc").max(40),
    stage: Joi.string().valid(...SALES_DEAL_STAGES),
    priority: Joi.string().valid("normal", "high", "urgent")
  }).unknown(true)
}).unknown(true);

const tokenPaymentBody = Joi.object({
  amount: positiveAmount,
  method: Joi.string().valid("cash", "neft", "upi", "cheque"),
  paymentDate: Joi.string().max(40),
  reference: optionalText(80, 0),
  proofUrl: Joi.string().trim().max(2000).allow("", null),
  notes: optionalText(2000, 0)
}).unknown(true);

const dealPatch = {
  assignedTo: Joi.alternatives().try(objectId, Joi.valid(null)),
  priority: Joi.string().valid("normal", "high", "urgent"),
  offeredPrice: positiveAmount.allow(null),
  agreedPrice: positiveAmount.allow(null),
  tokenAmount: nonNegativeAmount.allow(null),
  tokenPaid: Joi.boolean(),
  tokenPayment: tokenPaymentBody.allow(null),
  paymentType: Joi.string().valid("full", "stage").allow(null),
  totalPaid: nonNegativeAmount,
  fullPayment: Joi.object().unknown(true).allow(null),
  stagePayment: Joi.object().unknown(true).allow(null),
  interiorDesign: Joi.object().unknown(true).allow(null),
  documentation: Joi.object().unknown(true),
  lostReason: optionalText(500, 0),
  notes: optionalText(2000, 0),
  reengagement: Joi.object({
    followUpAt: Joi.date().iso().allow(null),
    lastContactAt: Joi.date().iso().allow(null),
    attempts: Joi.number().integer().min(0).max(100)
  }).unknown(true),
  financials: Joi.object().unknown(true)
};

export const createValidator = Joi.object({
  body: Joi.object({
    buyerId: objectId.required(),
    propertyId: objectId.required(),
    sourceEnquiryId: objectId,
    stage: Joi.string().valid(...SALES_DEAL_STAGES),
    priority: Joi.string().valid("normal", "high", "urgent"),
    assignedTo: Joi.alternatives().try(objectId, Joi.valid(null)),
    buyerSnapshot: Joi.object({
      name: optionalText(120),
      phone: optionalText(20),
      email: Joi.string().email().allow("", null),
      userType: Joi.string().valid("resident", "nri", "pio")
    }).unknown(true),
    propertySnapshot: Joi.object({
      title: optionalText(200),
      type: optionalText(40),
      location: optionalText(200),
      price: positiveAmount
    }).unknown(true),
    financials: Joi.object({
      offeredPrice: positiveAmount.allow(null),
      agreedPrice: positiveAmount.allow(null)
    }).unknown(true)
  }).unknown(true)
}).unknown(true);

export const updateValidator = Joi.object({
  body: Joi.object(dealPatch).min(1).unknown(true),
  params: Joi.object({ id: objectId, dealId: objectId }).unknown(true)
}).unknown(true);

export const statusValidator = Joi.object({
  body: Joi.object({
    status: Joi.string().max(40),
    stage: Joi.string().valid(...SALES_DEAL_STAGES),
    decision: Joi.string().max(40),
    notes: optionalText(2000, 0),
    reason: optionalText(500, 0),
    lostReason: optionalText(500, 1),
    ...dealPatch
  }).unknown(true),
  params: Joi.object({ id: objectId, dealId: objectId }).unknown(true)
}).unknown(true);
