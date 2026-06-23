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
export const service = {
  ...baseService,
  async create(data, actor) {
    if (data.sellRequestId) {
      const sellRequest = await SellRequest.findById(data.sellRequestId);
      if (!sellRequest || !["accepted", "approved", "active"].includes(sellRequest.status)) throw domainError("Acquisition requires an approved or accepted sell request.");
      const active = await repository.findOne({ sellRequestId: sellRequest._id, stage: { $nin: ["rejected", "acquired"] } });
      if (active) throw domainError("A sell request can have only one active acquisition.");
      return baseService.create({
        ...data,
        createdFrom: "sell_request",
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
      }, actor);
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
        type: data.type || acquisition.propertyType,
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