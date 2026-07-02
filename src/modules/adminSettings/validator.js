import Joi from "joi";

const bools = (keys) => Object.fromEntries(keys.map((key) => [key, Joi.boolean()]));
const boostPlan = Joi.object({
  id: Joi.string().trim().max(80).required(),
  name: Joi.string().trim().max(80).required(),
  priceLabel: Joi.string().trim().max(80).allow("").required(),
  description: Joi.string().trim().max(500).allow("").required(),
  benefits: Joi.array().items(Joi.string().trim().max(160)).max(12).required(),
  active: Joi.boolean().required()
}).unknown(false);
const interiorPackage = Joi.object({
  id: Joi.string().trim().max(80).required(),
  name: Joi.string().trim().max(80).required(),
  priceRange: Joi.string().trim().max(80).allow("").required(),
  timeline: Joi.string().trim().max(80).allow("").required(),
  active: Joi.boolean().required()
}).unknown(false);
const coupon = Joi.object({
  id: Joi.string().trim().max(80).required(),
  code: Joi.string().trim().uppercase().max(40).required(),
  discount: Joi.string().trim().max(80).required(),
  type: Joi.string().valid("% discount", "Flat discount").required(),
  appliesTo: Joi.string().trim().max(80).required(),
  uses: Joi.string().trim().max(80).allow("").required(),
  expiry: Joi.string().trim().max(80).allow("").required(),
  active: Joi.boolean().required()
}).unknown(false);

export const updateValidator = Joi.object({
  body: Joi.object({
    organization: Joi.object({
      name: Joi.string().trim().max(120),
      tagline: Joi.string().trim().allow("").max(180),
      email: Joi.string().trim().email().allow(""),
      phone: Joi.string().trim().allow("").max(40),
      address: Joi.string().trim().allow("").max(500),
      city: Joi.string().trim().allow("").max(80),
      state: Joi.string().trim().allow("").max(80),
      pincode: Joi.string().trim().allow("").max(20)
    }).unknown(false),
    app: Joi.object({
      maintenance: Joi.boolean(),
      registration: Joi.boolean(),
      kycRequired: Joi.boolean(),
      showPrices: Joi.boolean(),
      virtualTours: Joi.boolean(),
      stagePayment: Joi.boolean(),
      interior: Joi.boolean()
    }).unknown(false),
    sla: Joi.object({
      interiorHours: Joi.number().integer().min(1).max(168),
      stagePaymentHours: Joi.number().integer().min(1).max(168),
      enquiryHours: Joi.number().integer().min(1).max(168),
      autoEscalate: Joi.boolean(),
      escalateToAdminId: Joi.string().hex().length(24).allow(null),
      escalateToName: Joi.string().trim().allow("").max(120)
    }).unknown(false),
    alerts: Joi.object({
      triggers: Joi.object(bools(["slaBreached", "interiorInquiry", "stagePayment", "kycReview", "ticket48", "dailyEmail", "weeklyEmail"])).unknown(false),
      email: Joi.string().trim().email().allow(""),
      whatsapp: Joi.string().trim().allow("").max(40)
    }).unknown(false),
    notifications: Joi.object({
      contact: Joi.object({
        phone: Joi.string().trim().allow("").max(40),
        email: Joi.string().trim().email().allow(""),
        ccEmail: Joi.string().trim().email().allow("")
      }).unknown(false),
      email: Joi.object(bools(["enquiry", "sell", "kyc", "user", "stageProof", "ticket", "daily", "weekly"])).unknown(false),
      whatsapp: Joi.object(bools(["enquiry", "slaBreached"])).unknown(false)
    }).unknown(false),
    display: Joi.object({
      timezone: Joi.string().trim().valid("IST", "GST", "SGT", "GMT", "EST", "PST"),
      dateFormat: Joi.string().trim().valid("DD MMM YYYY", "DD/MM/YYYY", "MMM DD, YYYY", "YYYY-MM-DD"),
      currencyFormat: Joi.string().valid("indian", "international")
    }).unknown(false),
    payment: Joi.object({
      tokenAmount: Joi.number().integer().min(0),
      escrow: Joi.object({
        accountHolder: Joi.string().trim().max(120).allow(""),
        bankName: Joi.string().trim().max(120).allow(""),
        accountNumber: Joi.string().trim().max(80).allow(""),
        ifsc: Joi.string().trim().max(30).allow(""),
        branch: Joi.string().trim().max(160).allow(""),
        upiId: Joi.string().trim().max(120).allow(""),
        chequePayee: Joi.string().trim().max(120).allow(""),
        chequeInstructions: Joi.array().items(Joi.string().trim().max(240)).max(10)
      }).unknown(false)
    }).unknown(false),
    masterData: Joi.object().unknown(true),
    tools: Joi.object({
      boostPlans: Joi.array().items(boostPlan).max(20),
      interiorPackages: Joi.array().items(interiorPackage).max(50),
      coupons: Joi.array().items(coupon).max(200)
    }).unknown(false)
  }).min(1).unknown(false)
}).unknown(true);
