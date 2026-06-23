import { conflict, domainError, forbidden } from "./errors/AppError.js";
export const transitions = {
  propertyStatus: { draft: ["available"], available: ["reserved", "under_construction", "sold"], reserved: ["available", "sold"], under_construction: ["available"], sold: [] },
  buyEnquiryStatus: { new: ["responded", "visit_scheduled", "closed"], responded: ["visit_scheduled", "negotiating", "closed"], visit_scheduled: ["negotiating"], negotiating: ["closed"], closed: [] },
  sellRequestStatus: { draft: ["new"], new: ["under_review"], under_review: ["changes_requested", "rejected", "accepted", "approved"], changes_requested: ["new"], approved: ["active"], active: ["negotiating", "paused"], negotiating: ["sold"], paused: ["active"], rejected: [], sold: [] },
  acquisitionStage: { pending_review: ["site_inspection", "rejected", "on_hold"], site_inspection: ["valuation", "rejected", "on_hold"], valuation: ["negotiation", "rejected", "on_hold"], negotiation: ["token_to_seller", "rejected", "on_hold"], token_to_seller: ["documentation"], documentation: ["seller_payout"], seller_payout: ["acquired"], on_hold: ["pending_review"], acquired: [], rejected: [] },
  salesDealStage: { active_leads: ["site_visits", "lost"], site_visits: ["negotiation", "lost"], negotiation: ["token_payment", "lost"], token_payment: ["full_payment", "stage_payment"], full_payment: ["documentation"], stage_payment: ["interior_design"], interior_design: ["documentation"], documentation: ["closed"], lost: ["re_engagement"], re_engagement: ["active_leads"], closed: [] },
  visitStatus: { scheduled: ["confirmed", "rescheduled", "cancelled", "missed"], confirmed: ["completed", "rescheduled", "cancelled", "missed"], rescheduled: ["confirmed", "cancelled"], completed: [], cancelled: [], missed: [] },
  callbackStatus: { pending: ["called", "resolved", "missed", "rescheduled", "overdue"], called: ["resolved", "rescheduled"], rescheduled: ["called", "resolved", "overdue"], missed: ["rescheduled", "resolved"], overdue: ["called", "resolved", "rescheduled"], resolved: [] },
  interiorLeadStatus: { new: ["contacted", "declined"], contacted: ["quote_sent", "declined"], quote_sent: ["accepted", "negotiating", "declined"], negotiating: ["quote_sent", "accepted", "declined"], accepted: ["completed"], completed: [], declined: [] },
  supportTicketStatus: { open: ["in_progress", "resolved", "closed"], in_progress: ["resolved", "closed"], resolved: ["closed"], closed: [] },
  paymentStatus: { created: ["pending", "paid", "failed", "cancelled"], pending: ["paid", "failed", "cancelled"], paid: ["refunded"], failed: [], refunded: [], cancelled: [] }
};
export const assertTransition = (map, from, to) => {
  if (!transitions[map]?.[from]?.includes(to)) throw conflict(`Invalid state transition from ${from} to ${to}.`);
};
export const requireSuperAdmin = (actor, message) => {
  if (actor?.role !== "super_admin") throw forbidden(message || "Super admin approval required.");
};
export const validatePropertyPublication = (property) => {
  const missing = [];
  if (!property.title) missing.push("title");
  if (!property.description) missing.push("description");
  if (!property.type) missing.push("type");
  if (!property.address?.city) missing.push("address.city");
  if (!property.address?.locality) missing.push("address.locality");
  if (!/^\d{6}$/.test(property.address?.pincode || "")) missing.push("address.pincode");
  if (!(property.price > 0)) missing.push("price");
  if (!property.media?.coverPhoto && !(property.media?.photos || []).length) missing.push("media.coverPhoto");
  if (missing.length) throw domainError("Property cannot be published until required fields are complete.", missing.map((field) => ({ field, message: "Required for publication." })));
};