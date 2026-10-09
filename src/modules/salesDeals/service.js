import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { Property } from "../properties/model.js";
import { User } from "../users/model.js";
import { BuyEnquiry } from "../buyEnquiries/model.js";
import { domainError } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { assertTransition } from "../../shared/workflows.js";
import { withTransaction } from "../../shared/transactions.js";
import { assertFemaComplete, assertKycComplete } from "../../services/complianceRules.service.js";
const baseService = createService({ collection: "salesDeals", repository, workflowField: "stage", workflowMap: "salesDealStage", ownerField: "buyerId" });
const normalize = (value) => String(value || "").trim().toLowerCase();
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const propertyLocation = (property) => [property.address?.locality, property.address?.city].filter(Boolean).join(", ");
const recommendationReason = ({ sameType, sameCity, sameLocality, priceDeltaPct, underBudget }) => {
  const reasons = [];
  if (sameType) reasons.push("same property type");
  if (sameLocality) reasons.push("same locality");
  else if (sameCity) reasons.push("same city");
  if (underBudget) reasons.push("within buyer budget");
  if (priceDeltaPct <= 10) reasons.push("close price match");
  return reasons.length ? reasons.join(", ") : "available alternate property";
};
const requiredText = (value) => String(value || "").trim();
const positiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const buildUpdatePatch = (data = {}) => {
  const $set = { lastActivityAt: new Date() };
  if (data.assignedTo !== undefined) $set.assignedTo = data.assignedTo || null;
  if (data.priority !== undefined) $set.priority = data.priority;
  if (data.lostReason !== undefined) $set.lostReason = requiredText(data.lostReason) || null;
  if (data.documentation !== undefined) $set.documentation = data.documentation;
  if (data.reengagement !== undefined) $set.reengagement = data.reengagement;
  if (data.offeredPrice !== undefined) $set["financials.offeredPrice"] = data.offeredPrice;
  if (data.agreedPrice !== undefined) $set["financials.agreedPrice"] = data.agreedPrice;
  if (data.tokenAmount !== undefined) $set["financials.tokenAmount"] = data.tokenAmount;
  if (data.tokenPaid !== undefined) $set["financials.tokenPaid"] = data.tokenPaid;
  if (data.tokenPayment !== undefined) $set["financials.tokenPayment"] = data.tokenPayment;
  if (data.paymentType !== undefined) $set["financials.paymentType"] = data.paymentType;
  if (data.totalPaid !== undefined) $set["financials.totalPaid"] = data.totalPaid;
  if (data.fullPayment !== undefined) $set["financials.fullPayment"] = data.fullPayment;
  if (data.stagePayment !== undefined) $set["financials.stagePayment"] = data.stagePayment;
  if (data.interiorDesign !== undefined) $set["financials.interiorDesign"] = data.interiorDesign;
  if (data.financials && typeof data.financials === "object") {
    for (const [key, value] of Object.entries(data.financials)) {
      $set[`financials.${key}`] = value;
    }
  }
  return { $set };
};

export const service = {
  ...baseService,
  async update(id, data, actor, req) {
    if (data?.stage) throw domainError("Use the stage endpoint to change sales deal stage.");
    const hasMongoOperator = data && Object.keys(data).some((key) => key.startsWith("$"));
    return baseService.update(id, hasMongoOperator ? data : buildUpdatePatch(data), actor, req);
  },
  async create(data, actor) {
    const property = await Property.findOne({ _id: data.propertyId, status: { $ne: "sold" }, isDeleted: { $ne: true } });
    if (!property) throw domainError("Sales deal requires an unsold property.");
    if (data.sourceEnquiryId) {
      const active = await repository.findOne({ sourceEnquiryId: data.sourceEnquiryId, stage: { $ne: "lost" } });
      if (active) throw domainError("A sales deal already exists for this enquiry.");
    }
    return baseService.create({
      ...data,
      propertySnapshot: data.propertySnapshot || { title: property.title, type: property.type, location: [property.address?.locality, property.address?.city].filter(Boolean).join(", "), price: property.price },
      photos: data.photos || property.media?.photos || [],
      lastActivityAt: new Date()
    }, actor);
  },
  async transition(id, to, actor, req, extra = {}) {
    const before = await repository.findById(id);
    const financials = { ...(before.financials?.toObject?.() || before.financials || {}), ...(extra.financials || {}) };
    const agreedPrice = positiveNumber(extra.agreedPrice || financials.agreedPrice);
    const tokenPaid = Boolean(extra.tokenPaid || extra.financials?.tokenPaid || financials.tokenPaid);
    const totalPaid = Number(extra.totalPaid ?? financials.totalPaid ?? 0);
    if (to === "token_payment" && !agreedPrice) throw domainError("Agreed price is required before token payment.");
    if (["full_payment", "stage_payment"].includes(to) && !tokenPaid) throw domainError("Token must be paid before payment plan selection.");
    if (to === "closed") {
      const buyer = await User.findById(before.buyerId);
      assertKycComplete(buyer, "deal closure");
      assertFemaComplete(buyer, buyer.kycDocuments || [], "deal closure", actor);
      if (!financials.paymentType || !agreedPrice || !(totalPaid >= agreedPrice)) throw domainError("Deal closure requires completed payment terms.");
      extra.closedAt = new Date();
    }
    if (to === "lost" && !requiredText(extra.lostReason || extra.reason)) throw domainError("Lost reason is required.");
    const financialsChanged = Boolean(
      extra.agreedPrice !== undefined ||
      extra.offeredPrice !== undefined ||
      extra.tokenAmount !== undefined ||
      extra.tokenPaid !== undefined ||
      extra.tokenPayment !== undefined ||
      extra.paymentType !== undefined ||
      extra.totalPaid !== undefined ||
      extra.fullPayment !== undefined ||
      extra.stagePayment !== undefined ||
      extra.interiorDesign !== undefined ||
      extra.financials
    );
    const nextFinancials = {
      ...financials,
      ...(agreedPrice ? { agreedPrice } : {}),
      ...(extra.offeredPrice !== undefined ? { offeredPrice: extra.offeredPrice } : {}),
      ...(extra.tokenAmount !== undefined ? { tokenAmount: extra.tokenAmount } : {}),
      ...(extra.tokenPaid !== undefined || extra.financials?.tokenPaid !== undefined ? { tokenPaid } : {}),
      ...(extra.tokenPayment !== undefined ? { tokenPayment: extra.tokenPayment } : {}),
      ...(extra.paymentType !== undefined ? { paymentType: extra.paymentType } : {}),
      ...(extra.totalPaid !== undefined ? { totalPaid: extra.totalPaid } : {}),
      ...(extra.fullPayment !== undefined ? { fullPayment: extra.fullPayment } : {}),
      ...(extra.stagePayment !== undefined ? { stagePayment: extra.stagePayment } : {}),
      ...(extra.interiorDesign !== undefined ? { interiorDesign: extra.interiorDesign } : {})
    };
    const patch = {
      lastActivityAt: new Date(),
      ...(financialsChanged ? { financials: nextFinancials } : {}),
      notes: extra.notes,
      ...(to === "lost" ? { lostReason: requiredText(extra.lostReason || extra.reason) } : {}),
      ...(extra.reengagement ? { reengagement: extra.reengagement } : {}),
      ...(extra.documentation ? { documentation: extra.documentation } : {}),
      ...(extra.closedAt ? { closedAt: extra.closedAt } : {})
    };
    if (to === "closed") {
      return withTransaction(async (session) => {
        assertTransition("salesDealStage", before.stage, "closed");
        const after = await repository.update(id, { $set: { ...patch, stage: "closed" }, $push: { stageHistory: { from: before.stage, to: "closed", changedBy: actor?.id, changedAt: new Date(), notes: extra.notes } } }, { session });
        await Property.findByIdAndUpdate(before.propertyId, { status: "sold", soldAt: new Date() }, { session });
        if (before.sourceEnquiryId) await BuyEnquiry.findByIdAndUpdate(before.sourceEnquiryId, { status: "closed" }, { session });
        await writeAuditLog({ actor, action: "salesDeals.stage_changed", resourceType: "salesDeals", resourceId: id, before: before.toObject(), after: after.toObject(), req }, { session });
        return after;
      });
    }
    const doc = await baseService.transition(id, to, actor, req, patch);
    if (to === "token_payment" && tokenPaid) await Property.findByIdAndUpdate(before.propertyId, { status: "reserved" });
    return doc;
  },
  async recommendations(id, query = {}) {
    const deal = await repository.findById(id);
    const targetType = normalize(deal.propertySnapshot?.type);
    const targetLocation = normalize(deal.propertySnapshot?.location);
    const targetPrice = safeNumber(deal.financials?.agreedPrice || deal.financials?.offeredPrice || deal.propertySnapshot?.price);
    const search = normalize(query.search);
    const limit = Math.min(Math.max(safeNumber(query.limit, 6), 1), 20);
    const currentPropertyId = String(deal.propertyId || "");
    const filter = { status: "available", isDeleted: { $ne: true }, _id: { $ne: deal.propertyId } };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { title: regex },
        { type: regex },
        { "address.locality": regex },
        { "address.city": regex },
        { referenceId: regex }
      ];
    }
    const candidates = await Property.find(filter).sort({ createdAt: -1 }).limit(100);
    const ranked = candidates
      .filter((property) => String(property._id) !== currentPropertyId)
      .map((property) => {
        const propertyType = normalize(property.type);
        const city = normalize(property.address?.city);
        const locality = normalize(property.address?.locality);
        const sameType = Boolean(targetType && propertyType === targetType);
        const sameCity = Boolean(city && targetLocation.includes(city));
        const sameLocality = Boolean(locality && targetLocation.includes(locality));
        const price = safeNumber(property.price);
        const priceDeltaPct = targetPrice > 0 ? Math.abs(price - targetPrice) / targetPrice * 100 : 100;
        const underBudget = targetPrice > 0 && price <= targetPrice;
        const score =
          (sameType ? 30 : 0) +
          (sameLocality ? 25 : sameCity ? 15 : 0) +
          (underBudget ? 15 : 0) +
          Math.max(0, 20 - Math.min(priceDeltaPct, 20)) +
          Math.min(10, safeNumber(property.metrics?.savedCount) + safeNumber(property.metrics?.enquiries) + safeNumber(property.metrics?.visits));
        return {
          id: String(property._id),
          referenceId: property.referenceId,
          title: property.title,
          type: property.type,
          price,
          location: propertyLocation(property),
          city: property.address?.city || "",
          locality: property.address?.locality || "",
          coverPhoto: property.media?.coverPhoto || property.media?.photos?.[0] || "",
          photos: property.media?.photos || [],
          score: Math.round(score),
          reason: recommendationReason({ sameType, sameCity, sameLocality, priceDeltaPct, underBudget })
        };
      })
      .sort((a, b) => b.score - a.score || a.price - b.price)
      .slice(0, limit);
    return ranked;
  }
};