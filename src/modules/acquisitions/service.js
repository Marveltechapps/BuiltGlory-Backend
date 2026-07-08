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
export const service = {
  ...baseService,
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
    if (to === "valuation" && !(before.valuation?.amount || extra.valuation?.amount || extra.builtgloryOffer)) throw domainError("Valuation amount and notes are required.");
    if (to === "token_to_seller" && !(before.agreedPrice || extra.agreedPrice || extra.negotiation?.agreedPrice)) throw domainError("Agreed price is required before seller token.");
    if (to === "documentation" && !(before.token?.paid || extra.token?.paid)) throw domainError("Seller token payment must be recorded before documentation.");
    if (to === "seller_payout") assertLegalVerification({ documentation: { ...(before.documentation || {}), ...(extra.documentation || {}) }, action: "seller payout" });
    if (to === "acquired" && !(before.payout?.completed || extra.payout?.completed)) throw domainError("Completed payout is required before marking acquired.");
    if (to === "rejected" && !extra.rejectionReason) throw domainError("Rejection reason is required.");
    if (to === "on_hold" && !extra.onHoldReason) throw domainError("Hold reason is required.");
    return baseService.transition(id, to, actor, req, { ...extra, lastActivityAt: new Date() });
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