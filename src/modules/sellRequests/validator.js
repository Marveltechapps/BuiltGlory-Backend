import Joi from "joi";
import { PIN_PATTERN, PHONE_PATTERN, SELL_LIMITS, SELL_PROPERTY_TYPE_INPUTS } from "./validationRules.js";

export const idParam = Joi.object({ params: Joi.object({ id: Joi.string().hex().length(24) }).unknown(true) }).unknown(true);

const optionalText = (max, min = 1) => Joi.string().trim().min(min).max(max).allow("", null);
const optionalPositive = (min, max) => Joi.number().positive().min(min).max(max).allow(null);

const address = Joi.object({
  street: optionalText(SELL_LIMITS.streetMax),
  locality: optionalText(SELL_LIMITS.localityMax),
  city: optionalText(SELL_LIMITS.cityMax),
  state: optionalText(80),
  pincode: Joi.string().pattern(PIN_PATTERN).allow("", null),
  landmark: optionalText(120),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180)
});

const specifications = Joi.object({
  subType: optionalText(80),
  title: optionalText(SELL_LIMITS.titleMax),
  bhk: optionalText(20),
  builtUpArea: optionalPositive(SELL_LIMITS.areaMin, SELL_LIMITS.areaMax),
  plotArea: optionalPositive(SELL_LIMITS.areaMin, SELL_LIMITS.areaMax),
  area: optionalPositive(SELL_LIMITS.areaMin, SELL_LIMITS.areaMax),
  totalArea: optionalPositive(SELL_LIMITS.areaMin, SELL_LIMITS.areaMax),
  carpetArea: optionalPositive(SELL_LIMITS.areaMin, SELL_LIMITS.areaMax),
  floor: Joi.alternatives().try(Joi.string().max(20), Joi.number().min(SELL_LIMITS.floorMin).max(SELL_LIMITS.floorMax)).allow("", null),
  totalFloors: Joi.number().integer().min(SELL_LIMITS.totalFloorsMin).max(SELL_LIMITS.totalFloorsMax).allow(null),
  floors: Joi.number().integer().min(SELL_LIMITS.totalFloorsMin).max(SELL_LIMITS.totalFloorsMax).allow(null),
  unitNo: optionalText(40),
  unitNumber: optionalText(40),
  age: optionalText(40),
  propertyAge: optionalText(40),
  facing: optionalText(40),
  furnishing: optionalText(40),
  furnish: optionalText(40),
  furnishDetails: optionalText(500),
  parking: Joi.number().min(SELL_LIMITS.parkingMin).max(SELL_LIMITS.parkingMax).allow(null),
  parkingCount: Joi.number().min(SELL_LIMITS.parkingMin).max(SELL_LIMITS.parkingMax).allow(null),
  parkingType: optionalText(40),
  commercialType: optionalText(40),
  reraNumber: optionalText(40),
  rera: optionalText(40),
  roadWidth: optionalPositive(3, 200),
  approvalType: optionalText(40),
  countryOfResidence: optionalText(80),
  poaHolderName: optionalText(80),
  poaHolderPhone: Joi.string().pattern(PHONE_PATTERN).allow("", null),
  poaHolderEmail: Joi.string().email().allow("", null),
  sharePercentage: optionalPositive(SELL_LIMITS.sharePercentMin, SELL_LIMITS.sharePercentMax),
  totalPropertyValue: optionalPositive(SELL_LIMITS.priceMin, SELL_LIMITS.priceMax),
  legalStructure: optionalText(80),
  scopeOfWork: optionalText(80),
  budgetRange: optionalText(80),
  expectedStartDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}(?:T|$)/).allow("", null),
  virtualTourUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow("", null)
}).unknown(true);

const loanDetails = Joi.object({
  lender: optionalText(80),
  outstanding: Joi.number().positive().max(SELL_LIMITS.priceMax).allow(null)
}).unknown(true).allow(null);

const sellBody = {
  propertyType: Joi.string().valid(...SELL_PROPERTY_TYPE_INPUTS).max(40),
  propertyTitle: Joi.string().trim().max(SELL_LIMITS.titleMax).allow(""),
  askingPrice: Joi.number().positive().min(SELL_LIMITS.priceMin).max(SELL_LIMITS.priceMax),
  negotiable: Joi.boolean(),
  address,
  specifications,
  amenities: Joi.array().items(Joi.string().trim().max(60)),
  ownershipType: optionalText(80),
  possessionStatus: optionalText(80),
  loanOnProperty: Joi.boolean(),
  loanDetails,
  description: Joi.string().trim().max(SELL_LIMITS.descriptionMax).allow("", null),
  photos: Joi.array().items(Joi.string()).max(SELL_LIMITS.photosMax),
  documents: Joi.array().items(Joi.object().unknown(true)),
  draftStep: Joi.number().integer().min(1).max(7),
  isDraft: Joi.boolean(),
  status: Joi.string().valid("draft", "new")
};

export const listValidator = Joi.object({ query: Joi.object({ page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100), search: Joi.string().max(100), sort: Joi.string().valid("newest", "oldest"), status: Joi.string(), assignedTo: Joi.string().hex().length(24), sellerId: Joi.string().hex().length(24), propertyType: Joi.string(), city: Joi.string() }).unknown(false) }).unknown(true);
export const createValidator = Joi.object({ body: Joi.object(sellBody).min(1).unknown(false) }).unknown(true);
export const updateValidator = Joi.object({ body: Joi.object({ ...sellBody, changeRequests: Joi.array().items(Joi.string()), rejectionReason: Joi.string().allow("", null) }).min(1).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const valuationEstimateValidator = Joi.object({ body: Joi.object({ propertyType: Joi.string().valid(...SELL_PROPERTY_TYPE_INPUTS), address, specifications, amenities: Joi.array().items(Joi.string().trim().max(60)), askingPrice: Joi.number().positive().min(SELL_LIMITS.priceMin).max(SELL_LIMITS.priceMax) }).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
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
export const statusValidator = Joi.object({ body: Joi.object({
  decision: Joi.string().valid("under_review", "changes_requested", "rejected", "accepted", "approved", "active", "negotiating", "paused", "sold").required(),
  notes: Joi.string().allow("", null),
  reason: Joi.string().allow("", null),
  rejectionReason: Joi.string().allow("", null),
  pauseReason: Joi.string().allow("", null),
  changeRequests: Joi.array().items(Joi.string()),
  salePrice: Joi.number().positive(),
  saleDate: Joi.date().iso().allow("", null),
  saleBuyerName: Joi.string().allow("", null)
}).unknown(false), params: Joi.object().unknown(true) }).unknown(true);
export const offerDecisionValidator = Joi.object({
  body: Joi.object({
    decision: Joi.string().valid("accepted", "countered").required(),
    counterAmount: Joi.when("decision", { is: "countered", then: Joi.number().positive().required(), otherwise: Joi.number().positive() }),
    notes: Joi.string().max(1000).allow("", null)
  }).unknown(false),
  params: Joi.object().unknown(true)
}).unknown(true);
