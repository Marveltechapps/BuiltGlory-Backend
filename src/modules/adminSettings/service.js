import { AdminSetting } from "./model.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { DEFAULT_DASHBOARD_OPTIONS } from "../appConfig/dashboardOptions.js";

export const SETTINGS_KEY = "dashboard";

export const DEFAULT_ADMIN_SETTINGS = {
  organization: {
    name: "Builtglory",
    tagline: "Find. Flip. Flourish.",
    email: "support@builtglory.com",
    phone: "+91 80 1234 5678",
    address: "123 MG Road, Bangalore",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001"
  },
  app: {
    maintenance: false,
    registration: true,
    kycRequired: true,
    showPrices: true,
    virtualTours: true,
    stagePayment: true,
    interior: true
  },
  sla: {
    interiorHours: 24,
    stagePaymentHours: 4,
    enquiryHours: 2,
    autoEscalate: true,
    escalateToAdminId: null,
    escalateToName: "System Admin"
  },
  alerts: {
    triggers: {
      slaBreached: true,
      interiorInquiry: true,
      stagePayment: true,
      kycReview: true,
      ticket48: true,
      dailyEmail: false,
      weeklyEmail: false
    },
    email: "admin@builtglory.com",
    whatsapp: "+91 98765 43210"
  },
  notifications: {
    contact: {
      phone: "+91 98765 43210",
      email: "admin@builtglory.com",
      ccEmail: ""
    },
    email: {
      enquiry: true,
      sell: true,
      kyc: true,
      user: true,
      stageProof: true,
      ticket: true,
      daily: false,
      weekly: false
    },
    whatsapp: {
      enquiry: true,
      slaBreached: true
    }
  },
  display: {
    timezone: "IST",
    dateFormat: "DD MMM YYYY",
    currencyFormat: "indian"
  },
  payment: {
    tokenAmount: 250000,
    escrow: {
      accountHolder: "Builtglory Escrow A/C",
      bankName: "HDFC Bank",
      accountNumber: "50100234567891",
      ifsc: "HDFC0001234",
      branch: "Adyar, Chennai",
      upiId: "builtglory@hdfcbank",
      chequePayee: "Builtglory Escrow A/C",
      chequeInstructions: [
        "Draw the cheque in favour of Builtglory Escrow A/C.",
        "Write your enquiry ID on the reverse.",
        "Hand over to your advisor or courier to the nearest Builtglory office."
      ]
    }
  },
  masterData: DEFAULT_DASHBOARD_OPTIONS,
  tools: {
    boostPlans: [
      { id: "bp1", name: "Basic", priceLabel: "Free", description: "Standard visibility", benefits: ["Listed in search", "Basic analytics"], active: true },
      { id: "bp2", name: "Featured", priceLabel: "₹999/week", description: "Highlighted", benefits: ["Featured badge", "2x visibility", "Priority support"], active: true },
      { id: "bp3", name: "Premium", priceLabel: "₹2499/week", description: "Top of results", benefits: ["Top placement", "Home carousel", "Dedicated manager"], active: true }
    ],
    interiorPackages: [
      { id: "i1", name: "Budget", priceRange: "₹2-4L", timeline: "4 weeks", active: true },
      { id: "i2", name: "Standard", priceRange: "₹4-8L", timeline: "6 weeks", active: true },
      { id: "i3", name: "Premium", priceRange: "₹8-15L", timeline: "8 weeks", active: true },
      { id: "i4", name: "Luxury", priceRange: "₹15L+", timeline: "12 weeks", active: true }
    ],
    coupons: [
      { id: "cp1", code: "FIRST10", discount: "10%", type: "% discount", appliesTo: "Boost plans", uses: "45/100 uses", expiry: "31 Dec 2026", active: true },
      { id: "cp2", code: "NEWUSER", discount: "₹500", type: "Flat discount", appliesTo: "Interior", uses: "12/50 uses", expiry: "30 Jun 2026", active: true }
    ]
  }
};

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);

const deepMerge = (base, incoming) => {
  const merged = { ...base };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (value === undefined) continue;
    if (isPlainObject(value) && isPlainObject(merged[key])) merged[key] = deepMerge(merged[key], value);
    else merged[key] = value;
  }
  return merged;
};

const serialize = (doc) => {
  const raw = doc?.toObject ? doc.toObject() : doc || {};
  const merged = deepMerge(DEFAULT_ADMIN_SETTINGS, raw);
  return {
    id: raw._id ? String(raw._id) : undefined,
    key: raw.key || SETTINGS_KEY,
    organization: merged.organization,
    app: merged.app,
    sla: {
      ...merged.sla,
      escalateToAdminId: merged.sla.escalateToAdminId ? String(merged.sla.escalateToAdminId) : null
    },
    alerts: merged.alerts,
    notifications: merged.notifications,
    display: merged.display,
    payment: merged.payment,
    masterData: merged.masterData,
    tools: merged.tools,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : undefined
  };
};

export const service = {
  async get() {
    const existing = await AdminSetting.findOne({ key: SETTINGS_KEY });
    return serialize(existing);
  },

  async update(payload, actor, req) {
    const before = await AdminSetting.findOne({ key: SETTINGS_KEY });
    const current = serialize(before);
    const next = deepMerge(current, payload);
    delete next.id;
    delete next.updatedAt;
    delete next.updatedBy;

    const updated = await AdminSetting.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: { ...next, key: SETTINGS_KEY, updatedBy: actor?.id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await writeAuditLog({
      actor,
      action: "admin_settings.updated",
      resourceType: "admin_settings",
      resourceId: updated._id,
      before: before ? serialize(before) : null,
      after: serialize(updated),
      req
    });

    return serialize(updated);
  }
};
