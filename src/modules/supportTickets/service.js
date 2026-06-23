import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "supportTickets", repository, workflowField: "status", workflowMap: "supportTicketStatus", ownerField: "userId" });
export const service = {
  ...baseService,
  async create(data, actor) {
    return baseService.create({ ...data, userId: actor?.id, status: "open", slaDeadline: data.slaDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000) }, actor);
  },
  async addResponse(id, data, actor, req) {
    if (!data.message) throw domainError("Support response requires a message.");
    return baseService.update(id, {
      $push: { responses: { message: data.message, responderType: actor?.type, responderId: actor?.id, createdAt: new Date() } },
      $set: { status: data.resolve ? "resolved" : "in_progress" }
    }, actor, req);
  },
  async update(id, data, actor, req) {
    if (data.status === "resolved" && !data.resolutionResponse && !data.message) throw domainError("Resolved tickets require a resolution response.");
    if (data.escalation && (!data.escalation.targetAssignee || !data.escalation.reason)) throw domainError("Escalation requires target assignee and reason.");
    const patch = data.escalation ? { ...data, escalation: { ...data.escalation, escalatedAt: new Date() } } : data;
    return baseService.update(id, patch, actor, req);
  }
};