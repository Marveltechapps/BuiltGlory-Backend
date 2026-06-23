import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "chatThreads", repository, workflowField: null, workflowMap: null, ownerField: null });
export const service = {
  ...baseService,
  async addMessage(id, data, actor, req) {
    if (data.type === "offer" && !(Number(data.offerAmount) > 0)) throw domainError("Offer messages require a positive offer amount.");
    const message = { sender: actor?.type === "admin" ? "admin" : "buyer", senderId: actor?.id, type: data.type || "text", text: data.text, offerAmount: data.offerAmount, offerStatus: data.type === "offer" ? "pending" : undefined, createdAt: new Date() };
    return baseService.update(id, { $push: { messages: message, timeline: { event: data.type === "offer" ? "offer_created" : "message_sent", actorId: actor?.id, amount: data.offerAmount, createdAt: new Date() } }, $set: { lastMessageAt: new Date() } }, actor, req);
  },
  async respondToOffer(id, messageId, data, actor, req) {
    const thread = await repository.findById(id);
    const message = thread.messages.id(messageId);
    if (!message || message.type !== "offer") throw domainError("Offer message not found.");
    if (!["accepted", "declined", "countered"].includes(data.decision)) throw domainError("Offer decision must be accepted, declined, or countered.");
    message.offerStatus = data.decision;
    thread.offerHistory.push({ messageId: message._id, action: data.decision, amount: message.offerAmount, actorId: actor?.id, actedAt: new Date() });
    thread.timeline.push({ event: `offer_${data.decision}`, messageId: message._id, actorId: actor?.id, amount: message.offerAmount, createdAt: new Date() });
    if (data.decision === "accepted") {
      thread.status = "deal_agreed";
      thread.negotiation = { ...(thread.negotiation?.toObject?.() || thread.negotiation || {}), agreedPrice: message.offerAmount };
      thread.messages.push({ sender: "admin", senderId: actor?.id, type: "deal_agreed", text: data.notes || "Offer accepted.", createdAt: new Date() });
    }
    if (data.decision === "countered") {
      if (!(Number(data.counterAmount) > 0)) throw domainError("Counter offer requires a positive amount.");
      thread.messages.push({ sender: "admin", senderId: actor?.id, type: "offer", text: data.notes, offerAmount: data.counterAmount, offerStatus: "pending", createdAt: new Date() });
      thread.offerHistory.push({ action: "counter_created", amount: data.counterAmount, actorId: actor?.id, actedAt: new Date() });
    }
    if (thread.negotiation?.deadline) {
      const msUntilDeadline = new Date(thread.negotiation.deadline).getTime() - Date.now();
      thread.negotiation.deadlineAlertAt = msUntilDeadline <= 2 * 24 * 60 * 60 * 1000 ? new Date() : thread.negotiation.deadlineAlertAt;
    }
    thread.negotiation = { ...(thread.negotiation?.toObject?.() || thread.negotiation || {}), longNegotiationAlert: thread.createdAt && Date.now() - new Date(thread.createdAt).getTime() > 14 * 24 * 60 * 60 * 1000 };
    thread.lastMessageAt = new Date();
    await thread.save();
    await baseService.update(id, { lastMessageAt: thread.lastMessageAt }, actor, req);
    return thread;
  }
};