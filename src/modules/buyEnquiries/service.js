import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { Property } from "../properties/model.js";
import { User } from "../users/model.js";
import { SalesDeal } from "../salesDeals/model.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "buyEnquiries", repository, workflowField: "status", workflowMap: "buyEnquiryStatus", ownerField: "buyerId" });
export const service = {
  ...baseService,
  async create(data, actor) {
    const buyer = await User.findById(actor?.id);
    if (!buyer || buyer.isBlocked) throw domainError("Blocked or inactive customers cannot create enquiries.");
    if (data.preferredContact === "email" && !buyer.email) throw domainError("Email contact requires a customer email.");
    if (data.interestType === "schedule_visit" && !data.preferredVisitTime && !data.preferredVisitDate) throw domainError("Visit preference is required for schedule visit enquiries.");
    const property = await Property.findOne({ _id: data.propertyId, status: { $in: ["available", "reserved", "under_construction"] }, isDeleted: { $ne: true } });
    if (!property) throw domainError("Property must exist and be visible.");
    const original = await repository.findOne({ propertyId: property._id, buyerId: buyer._id });
    return baseService.create({
      ...data,
      buyerId: buyer._id,
      buyerSnapshot: { name: buyer.name, phone: buyer.phone, email: buyer.email, userType: buyer.userType },
      propertySnapshot: { title: property.title, price: property.price, type: property.type, location: [property.address?.locality, property.address?.city].filter(Boolean).join(", ") },
      duplicateOf: original?._id || null,
      submittedAt: new Date()
    }, actor);
  },
  async cancel(id, actor, req) {
    const enquiry = await repository.findById(id);
    if (String(enquiry.buyerId) !== String(actor?.id)) throw domainError("You cannot cancel this enquiry.");
    const activeDeal = await SalesDeal.findOne({ sourceEnquiryId: enquiry._id, stage: { $ne: "lost" }, isDeleted: { $ne: true } });
    if (activeDeal) throw domainError("Cannot cancel enquiry after an active deal has started.");
    return baseService.transition(id, "closed", actor, req, { reason: "customer_cancelled" });
  }
};