import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { SellRequest } from "../sellRequests/model.js";
import { Property } from "../properties/model.js";
import { domainError } from "../../shared/errors/AppError.js";
import { makeReferenceId } from "../../shared/id.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { withTransaction } from "../../shared/transactions.js";
import { assertLegalVerification } from "../../services/legalDocumentRules.service.js";
const baseService = createService({ collection: "acquisitions", repository, workflowField: "stage", workflowMap: "acquisitionStage", ownerField: null });
const ACQUISITION_SELL_REQUEST_STATUSES = ["new", "under_review", "accepted", "approved", "active"];
const buildAcquisitionFromSellRequest = (sellRequest, data = {}) => ({
  ...data,
  createdFrom: "sell_request",
  sellRequestId: sellRequest._id,
  sellerId: sellRequest.sellerId,
  sellerSnapshot: sellRequest.sellerSnapshot,
  propertyTitle: sellRequest.propertyTitle,
  propertyType: sellRequest.propertyType,
  propertyLocation: [sellRequest.address?.locality, sellRequest.address?.city].filter(Boolean).join(", "),
  propertyCity: sellRequest.address?.city,
  askingPrice: sellRequest.askingPrice,
  photos: sellRequest.photos,
  propertyDetails: { address: sellRequest.address, specifications: sellRequest.specifications, amenities: sellRequest.amenities },
  lastActivityAt: new Date()
});
const normalizePropertyType = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[\s-]+/g, "_");
  const aliases = {
    plot: "plot", plots: "plot", apartment: "apartment", flat: "apartment", flats: "apartment",
    residential: "residential", house: "residential", commercial: "commercial", villa: "villa",
    organic_home: "organic_home", organic: "organic_home", "3d_printing": "3d_printing", "3d_print": "3d_printing",
    fractional: "fractional", ceo_mansion: "ceo_mansion", ceo: "ceo_mansion", holiday_home: "holiday_home",
    holiday: "holiday_home", land: "land", farmhouse: "farmhouse", farm: "farmhouse", nri: "nri", interior: "interior"
  };
  return aliases[normalized] || normalized;
};
const requiredText = (value) => String(value || "").trim();
const positiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const mergeSection = (before, extra, key) => ({ ...(before?.[key]?.toObject?.() || before?.[key] || {}), ...(extra?.[key] || {}) });
const buildUpdatePatch = (data = {}) => {
  const $set = { lastActivityAt: new Date() };
  if (data.assignedTo !== undefined) $set.assignedTo = data.assignedTo || null;
  if (data.priority !== undefined) $set.priority = data.priority;
  if (data.builtgloryOffer !== undefined) $set.builtgloryOffer = data.builtgloryOffer;
  if (data.agreedPrice !== undefined) $set.agreedPrice = data.agreedPrice;
  if (data.finalPurchasePrice !== undefined) $set.finalPurchasePrice = data.finalPurchasePrice;
  if (data.rejectionReason !== undefined) $set.rejectionReason = requiredText(data.rejectionReason) || null;
  if (data.onHoldReason !== undefined) $set.onHoldReason = requiredText(data.onHoldReason) || null;
  if (data.propertyDetails !== undefined) $set.propertyDetails = data.propertyDetails;
  if (data.valuation !== undefined) {
    $set.valuation = data.valuation;
    const offer = positiveNumber(data.valuation?.amount || data.valuation?.builtgloryValuation || data.builtgloryOffer);
    if (offer) $set.builtgloryOffer = offer;
  }
  if (data.negotiation !== undefined) {
    $set.negotiation = data.negotiation;
    const agreed = positiveNumber(data.negotiation?.agreedPrice || data.agreedPrice);
    if (agreed) $set.agreedPrice = agreed;
  }
  if (data.token !== undefined) $set.token = data.token;
  if (data.documentation !== undefined) $set.documentation = data.documentation;
  if (data.payout !== undefined) $set.payout = data.payout;
  return { $set };
};

export const service = {
  ...baseService,
  async update(id, data, actor, req) {
    if (data?.stage) throw domainError("Use the stage endpoint to change acquisition stage.");
    return baseService.update(id, buildUpdatePatch(data), actor, req);
  },
  async syncFromSellRequests(actor) {
    const sellRequests = await SellRequest.find({
      status: { $in: ACQUISITION_SELL_REQUEST_STATUSES },
      isDeleted: { $ne: true }
    }).select("_id");
    for (const sellRequest of sellRequests) {
      const active = await repository.findOne({
        sellRequestId: sellRequest._id,
        stage: { $nin: ["rejected", "acquired"] }
      });
      if (active) continue;
      try {
        await this.create({ sellRequestId: sellRequest._id }, actor);
      } catch {
        // Ignore individual backfill failures so listing still works.
      }
    }
  },
  async list(query, actor) {
    await this.syncFromSellRequests(actor);
    return baseService.list(query, actor);
  },
  async create(data, actor) {
    if (data.sellRequestId) {
      const sellRequest = await SellRequest.findById(data.sellRequestId);
      if (!sellRequest || sellRequest.isDeleted) throw domainError("Sell request not found.");
      if (!ACQUISITION_SELL_REQUEST_STATUSES.includes(sellRequest.status)) {
        throw domainError("Acquisition requires a submitted sell request.");
      }
      const active = await repository.findOne({ sellRequestId: sellRequest._id, stage: { $nin: ["rejected", "acquired"] } });
      if (active) return active;
      return baseService.create(buildAcquisitionFromSellRequest(sellRequest, data), actor);
    }
    return baseService.create({ ...data, createdFrom: data.createdFrom || "manual", lastActivityAt: new Date() }, actor);
  },
  async transition(id, to, actor, req, extra = {}) {
    const before = await repository.findById(id);
    const valuation = mergeSection(before, extra, "valuation");
    const negotiation = mergeSection(before, extra, "negotiation");
    const token = mergeSection(before, extra, "token");
    const documentation = mergeSection(before, extra, "documentation");
    const payout = mergeSection(before, extra, "payout");
    const builtgloryOffer = positiveNumber(extra.builtgloryOffer || valuation.amount || valuation.builtgloryValuation || before.builtgloryOffer);
    const agreedPrice = positiveNumber(extra.agreedPrice || negotiation.agreedPrice || before.agreedPrice);
    if (to === "negotiation" && before.stage !== "on_hold" && !builtgloryOffer) {
      throw domainError("Valuation amount is required before negotiation.");
    }
    if (to === "token_to_seller" && before.stage !== "on_hold" && !agreedPrice) {
      throw domainError("Agreed price is required before seller token.");
    }
    if (to === "documentation" && before.stage !== "on_hold" && !(token.paid || extra.token?.paid)) {
      throw domainError("Seller token payment must be recorded before documentation.");
    }
    if (to === "seller_payout" && before.stage !== "on_hold") {
      assertLegalVerification({ documentation: { ...(before.documentation || {}), ...documentation }, action: "seller payout" });
    }
    if (to === "acquired" && before.stage !== "on_hold" && !(payout.completed || extra.payout?.completed)) {
      throw domainError("Completed payout is required before marking acquired.");
    }
    if (to === "rejected" && !requiredText(extra.rejectionReason || extra.reason)) throw domainError("Rejection reason is required.");
    if (to === "on_hold" && !requiredText(extra.onHoldReason || extra.reason || extra.notes)) throw domainError("Hold reason is required.");
    const patch = {
      ...extra,
      lastActivityAt: new Date(),
      ...(extra.valuation && { valuation }),
      ...(extra.negotiation && { negotiation }),
      ...(extra.token && { token }),
      ...(extra.documentation && { documentation }),
      ...(extra.payout && { payout }),
      ...(builtgloryOffer ? { builtgloryOffer } : {}),
      ...(agreedPrice ? { agreedPrice } : {}),
      ...(to === "rejected" ? { rejectionReason: requiredText(extra.rejectionReason || extra.reason) } : {}),
      ...(to === "on_hold" ? { onHoldReason: requiredText(extra.onHoldReason || extra.reason || extra.notes) } : {}),
      ...(to === "pending_review" && before.stage === "rejected" ? { rejectionReason: null } : {}),
      ...(before.stage === "on_hold" && to !== "on_hold" ? { onHoldReason: extra.onHoldReason === undefined ? null : extra.onHoldReason } : {})
    };
    delete patch.stage;
    delete patch.status;
    delete patch.decision;
    return baseService.transition(id, to, actor, req, patch);
  },
  async convertToProperty(id, data, actor, req) {
    const acquisition = await repository.findById(id);
    if (acquisition.stage !== "acquired") throw domainError("Only acquired assets can convert to property drafts.");
    return withTransaction(async (session) => {
      const property = await Property.create([{
        referenceId: makeReferenceId("properties"),
        title: data.title || acquisition.propertyTitle,
        description: data.description || acquisition.propertyTitle,
        type: normalizePropertyType(data.type || acquisition.propertyType),
        price: data.price || acquisition.finalPurchasePrice || acquisition.agreedPrice || acquisition.askingPrice,
        address: data.address || acquisition.propertyDetails?.address,
        media: { photos: acquisition.photos || [] },
        source: "acquired",
        status: "draft",
        acquisitionId: acquisition._id
      }], { session }).then((rows) => rows[0]);
      await writeAuditLog({ actor, action: "acquisitions.converted_to_property", resourceType: "acquisitions", resourceId: acquisition._id, before: acquisition.toObject(), after: { propertyId: property._id, referenceId: property.referenceId }, req }, { session });
      return property;
    });
  }
};