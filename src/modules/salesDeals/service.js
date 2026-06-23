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
  }
};