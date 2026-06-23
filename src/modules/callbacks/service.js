import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "callbacks", repository, workflowField: "status", workflowMap: "callbackStatus", ownerField: "userId" });
export const service = {
  ...baseService,
  async create(data, actor) {
    if (data.preferredTime && new Date(data.preferredTime) <= new Date()) throw domainError("Callback preferred time cannot be in the past.");
    return baseService.create({
      ...data,
      userId: actor?.id,
      slaDeadline: data.slaDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000)
    }, actor);
  },
  async addAttempt(id, data, actor, req) {
    if (data.outcome === "callback_later" && !data.preferredTime) throw domainError("Callback later attempts require a new preferred time.");
    const patch = {
      $push: { attempts: { outcome: data.outcome, notes: data.notes, attemptedAt: new Date(), attemptedBy: actor?.id } },
      $inc: { attemptsCount: 1 },
      $set: { status: data.outcome === "answered" ? "called" : data.outcome === "callback_later" ? "rescheduled" : "missed" }
    };
    if (data.preferredTime) patch.$set.preferredTime = data.preferredTime;
    return baseService.update(id, patch, actor, req);
  },
  async transition(id, to, actor, req, extra = {}) {
    if (to === "resolved" && !extra.resolutionNotes && !extra.notes) throw domainError("Resolution requires notes.");
    if (to === "rescheduled") {
      if (!extra.preferredTime || new Date(extra.preferredTime) <= new Date()) throw domainError("Rescheduling requires a future preferred time.");
      if (!extra.reason) throw domainError("Rescheduling requires a reason.");
    }
    return baseService.transition(id, to, actor, req, extra);
  }
};