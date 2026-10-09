import Joi from "joi";
import { ACQUISITION_STAGES } from "../../constants/enums.js";

const objectId = Joi.string().hex().length(24);
const optionalText = (max, min = 1) => Joi.string().trim().min(min).max(max).allow("", null);
const positiveAmount = Joi.number().positive().max(1e12);
const nonNegativeAmount = Joi.number().min(0).max(1e12);

export const idParam = Joi.object({ params: Joi.object({ id: objectId, acquisitionId: objectId }).unknown(true) }).unknown(true);

export const listValidator = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    search: Joi.string().trim().max(100).allow(""),
    sort: Joi.string().valid("newest", "oldest", "price_asc", "price_desc").max(40),
    stage: Joi.string().valid(...ACQUISITION_STAGES),
    priority: Joi.string().valid("normal", "high", "urgent")
  }).unknown(true)
}).unknown(true);

const valuationBody = Joi.object({
  amount: positiveAmount,
  marketValue: positiveAmount,
  builtgloryValuation: positiveAmount,
  valuedBy: optionalText(120),
  valuationDate: Joi.string().max(40).allow("", null),
  comparables: optionalText(2000, 0),
  notes: optionalText(2000, 0),
  reportFileName: optionalText(260, 0),
  inspectionSummary: Joi.object().unknown(true),
  siteInspection: Joi.object().unknown(true)
}).unknown(true);

const tokenBody = Joi.object({
  paid: Joi.boolean(),
  amount: nonNegativeAmount,
  payment: Joi.object({
    amount: positiveAmount.required(),
    method: Joi.string().valid("cash", "neft", "upi", "cheque").required(),
    paymentDate: Joi.string().max(40).required(),
    reference: optionalText(80, 0),
    proofUrl: Joi.string().trim().max(2000).allow("", null),
    notes: optionalText(2000, 0)
  }).unknown(true)
}).unknown(true);

const payoutBody = Joi.object({
  completed: Joi.boolean(),
  amount: nonNegativeAmount,
  method: Joi.string().max(40).allow("", null),
  notes: optionalText(2000, 0)
}).unknown(true);

const acquisitionPatch = {
  assignedTo: Joi.alternatives().try(objectId, Joi.valid(null)),
  priority: Joi.string().valid("normal", "high", "urgent"),
  builtgloryOffer: positiveAmount.allow(null),
  agreedPrice: positiveAmount.allow(null),
  finalPurchasePrice: positiveAmount.allow(null),
  rejectionReason: optionalText(500, 0),
  onHoldReason: optionalText(500, 0),
  notes: optionalText(2000, 0),
  valuation: valuationBody,
  negotiation: Joi.object({
    agreedPrice: positiveAmount,
    offers: Joi.array().items(Joi.object().unknown(true)),
    notes: optionalText(2000, 0)
  }).unknown(true),
  token: tokenBody,
  documentation: Joi.object().unknown(true),
  payout: payoutBody,
  propertyDetails: Joi.object().unknown(true)
};

export const createValidator = Joi.object({
  body: Joi.object({
    sellRequestId: objectId,
    createdFrom: Joi.string().valid("sell_request", "manual"),
    ...acquisitionPatch
  }).min(1).unknown(true)
}).unknown(true);

export const updateValidator = Joi.object({
  body: Joi.object(acquisitionPatch).min(1).unknown(true),
  params: Joi.object({ id: objectId, acquisitionId: objectId }).unknown(true)
}).unknown(true);

export const statusValidator = Joi.object({
  body: Joi.object({
    status: Joi.string().max(40),
    stage: Joi.string().valid(...ACQUISITION_STAGES),
    decision: Joi.string().max(40),
    notes: optionalText(2000, 0),
    reason: optionalText(500, 0),
    rejectionReason: optionalText(500, 1),
    onHoldReason: optionalText(500, 1),
    ...acquisitionPatch
  }).unknown(true),
  params: Joi.object({ id: objectId, acquisitionId: objectId }).unknown(true)
}).unknown(true);
