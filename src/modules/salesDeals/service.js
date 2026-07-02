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
export const service = {
  ...baseService,
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
    if (to === "token_payment" && !(before.financials?.agreedPrice || extra.financials?.agreedPrice || extra.agreedPrice)) throw domainError("Agreed price is required before token payment.");
    if (["full_payment", "stage_payment"].includes(to) && !(before.financials?.tokenPaid || extra.financials?.tokenPaid || extra.tokenPaid)) throw domainError("Token must be paid before payment plan selection.");
    if (to === "closed") {
      const buyer = await User.findById(before.buyerId);
      assertKycComplete(buyer, "deal closure");
      assertFemaComplete(buyer, buyer.kycDocuments || [], "deal closure", actor);
      const financials = { ...(before.financials?.toObject?.() || before.financials || {}), ...(extra.financials || {}) };
      if (!financials.paymentType || financials.totalPaid < financials.agreedPrice) throw domainError("Deal closure requires completed payment terms.");
      extra.closedAt = new Date();
    }
    if (to === "lost" && !extra.lostReason) throw domainError("Lost reason is required.");
    if (to === "closed") {
      return withTransaction(async (session) => {
        assertTransition("salesDealStage", before.stage, "closed");
        const after = await repository.update(id, { ...extra, stage: "closed", lastActivityAt: new Date() }, { session });
        await Property.findByIdAndUpdate(before.propertyId, { status: "sold", soldAt: new Date() }, { session });
        if (before.sourceEnquiryId) await BuyEnquiry.findByIdAndUpdate(before.sourceEnquiryId, { status: "closed" }, { session });
        await writeAuditLog({ actor, action: "salesDeals.stage_changed", resourceType: "salesDeals", resourceId: id, before: before.toObject(), after: after.toObject(), req }, { session });
        return after;
      });
    }
    const doc = await baseService.transition(id, to, actor, req, { ...extra, lastActivityAt: new Date() });
    if (to === "token_payment" && (extra.financials?.tokenPaid || extra.tokenPaid)) await Property.findByIdAndUpdate(before.propertyId, { status: "reserved" });
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