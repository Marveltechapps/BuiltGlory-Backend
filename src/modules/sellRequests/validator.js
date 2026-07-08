import Joi from "joi";
export const idParam = Joi.object({ params: Joi.object({ id: Joi.string().hex().length(24) }).unknown(true) }).unknown(true);
const address = Joi.object({ street: Joi.string().allow("", null), locality: Joi.string().allow("", null), city: Joi.string().allow("", null), state: Joi.string().allow("", null), pincode: Joi.string().pattern(/^\d{6}$/).allow("", null), landmark: Joi.string().allow("", null), latitude: Joi.number(), longitude: Joi.number() });
export const listValidator = Joi.object({ query: Joi.object({ page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100), search: Joi.string().max(100), sort: Joi.string().valid("newest", "oldest"), status: Joi.string(), assignedTo: Joi.string().hex().length(24), sellerId: Joi.string().hex().length(24), propertyType: Joi.string(), city: Joi.string() }).unknown(false) }).unknown(true);
export const createValidator = Joi.object({ body: Joi.object({ propertyType: Joi.string(), propertyTitle: Joi.string().max(200), askingPrice: Joi.number().positive(), negotiable: Joi.boolean(), address, specifications: Joi.object().unknown(true), amenities: Joi.array().items(Joi.string()), ownershipType: Joi.string(), possessionStatus: Joi.string(), loanOnProperty: Joi.boolean(), loanDetails: Joi.object().unknown(true), description: Joi.string().max(5000).allow("", null), photos: Joi.array().items(Joi.string()), documents: Joi.array().items(Joi.object().unknown(true)), draftStep: Joi.number().integer().min(1), isDraft: Joi.boolean(), status: Joi.string().valid("draft", "new") }).min(1).unknown(false) }).unknown(true);
export const updateValidator = Joi.object({ body: Joi.object({ propertyType: Joi.string(), propertyTitle: Joi.string().max(200), askingPrice: Joi.number().positive(), negotiable: Joi.boolean(), address, specifications: Joi.object().unknown(true), amenities: Joi.array().items(Joi.string()), ownershipType: Joi.string(), possessionStatus: Joi.string(), loanOnProperty: Joi.boolean(), loanDetails: Joi.object().unknown(true), description: Joi.string().max(5000).allow("", null), photos: Joi.array().items(Joi.string()), documents: Joi.array().items(Joi.object().unknown(true)), draftStep: Joi.number().integer().min(1), changeRequests: Joi.array().items(Joi.string()), rejectionReason: Joi.string().allow("", null) }).min(1).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const valuationEstimateValidator = Joi.object({ body: Joi.object({ propertyType: Joi.string(), address, specifications: Joi.object().unknown(true), amenities: Joi.array().items(Joi.string()), askingPrice: Joi.number().positive() }).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const sellerMessageValidator = Joi.object({ body: Joi.object({ text: Joi.string().trim().max(2000).required() }).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const sellerVisitActionValidator = Joi.object({
  body: Joi.object({
    action: Joi.string().valid("confirm", "reschedule").required(),
    visitDate: Joi.when("action", { is: "reschedule", then: Joi.date().iso().required(), otherwise: Joi.date().iso() }),
    visitTime: Joi.when("action", { is: "reschedule", then: Joi.string().max(40).required(), otherwise: Joi.string().max(40) }),
    reason: Joi.string().max(500).allow("", null),
    meetingLink: Joi.string().uri().allow("", null)
  }).unknown(false),
  params: Joi.object().unknown(true)
}).unknown(true);
export const adminUpdateValidator = Joi.object({ body: Joi.object({ assignedTo: Joi.string().hex().length(24).allow(null) }).min(1).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const statusValidator = Joi.object({ body: Joi.object({ decision: Joi.string().valid("under_review", "changes_requested", "rejected", "accepted", "approved", "active", "negotiating", "paused", "sold").required(), notes: Joi.string().allow("", null), reason: Joi.string().allow("", null), rejectionReason: Joi.string().allow("", null), changeRequests: Joi.array().items(Joi.string()) }).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const offerDecisionValidator = Joi.object({
  body: Joi.object({
    decision: Joi.string().valid("accepted", "countered").required(),
    counterAmount: Joi.when("decision", { is: "countered", then: Joi.number().positive().required(), otherwise: Joi.number().positive() }),
    notes: Joi.string().max(1000).allow("", null)
  }).unknown(false),
  params: Joi.object().unknown(true)
}).unknown(true);