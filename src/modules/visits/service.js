import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { Property } from "../properties/model.js";
import { User } from "../users/model.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "visits", repository, workflowField: "status", workflowMap: "visitStatus", ownerField: "buyerId" });
const visitDateTime = (data) => new Date(`${data.visitDate} ${data.visitTime || "00:00"}`);
export const service = {
  ...baseService,
  async create(data, actor) {
    const buyer = await User.findById(actor?.id);
    const property = await Property.findOne({ _id: data.propertyId, status: { $in: ["available", "reserved", "under_construction"] }, isDeleted: { $ne: true } });
    if (!buyer || buyer.isBlocked) throw domainError("Blocked or inactive customers cannot schedule visits.");
    if (!property || property.status === "sold") throw domainError("Visit requires a visible unsold property.");
    if (visitDateTime(data) <= new Date()) throw domainError("Visit date and time must be in the future.");
    if (data.visitType === "physical" && !property.address?.locality) throw domainError("Physical visits require property location.");
    return baseService.create({ ...data, buyerId: buyer._id }, actor);
  },
  async transition(id, to, actor, req, extra = {}) {
    const before = await repository.findById(id);
    if (to === "rescheduled") {
      if (!extra.visitDate || visitDateTime(extra) <= new Date()) throw domainError("Reschedule requires a future visit date and time.");
      extra.$push = { rescheduleHistory: { previousDate: before.visitDate, previousTime: before.visitTime, newDate: extra.visitDate, newTime: extra.visitTime, reason: extra.reason, actorType: actor?.type, actorId: actor?.id, changedAt: new Date() } };
      extra.$inc = { rescheduleCount: 1 };
    }
    if (to === "cancelled" && !extra.reason) throw domainError("Cancellation requires a reason.");
    if (to === "confirmed" && before.visitType === "virtual" && !(before.meetingLink || extra.meetingLink)) throw domainError("Virtual visits require a meeting link before confirmation.");
    if (to === "completed") {
      const feedback = extra.feedback || {};
      if (!feedback.buyerInterest || !feedback.notes || !feedback.nextAction) throw domainError("Completed visits require feedback.");
      extra.feedback = { ...feedback, completedAt: new Date() };
    }
    return baseService.transition(id, to, actor, req, extra);
  }
};