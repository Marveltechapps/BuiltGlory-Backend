import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "interiorLeads", repository, workflowField: "status", workflowMap: "interiorLeadStatus", ownerField: "buyerId" });
export const service = {
  ...baseService,
  async create(data, actor) {
    if (!data.buyerId || !data.propertyId || !(data.selectedRooms || []).length || !data.designStyle || !data.budgetRange) throw domainError("Interior lead requires buyer, property, rooms, design style, and budget range.");
    return baseService.create({ ...data, slaDeadline: data.slaDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000) }, actor);
  },
  async update(id, data, actor, req) {
    if (data.status === "quote_sent") {
      const quote = data.quote || {};
      if (!quote.amount || !quote.packageName || !quote.timeline || !(quote.inclusions || []).length || !quote.validUntil) throw domainError("Quote sent requires amount, package, timeline, inclusions, and validity date.");
    }
    if (data.status === "accepted" && !data.customerAcceptedAt) data.customerAcceptedAt = new Date();
    if (data.status === "completed" && !data.completionNote) throw domainError("Completed interior leads require a completion note.");
    return baseService.update(id, data, actor, req);
  }
};