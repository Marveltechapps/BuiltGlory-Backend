import mongoose from "mongoose";
import { makeReferenceId } from "./id.js";
import { assertTransition, requireSuperAdmin, validatePropertyPublication } from "./workflows.js";
import { domainError } from "./errors/AppError.js";
import { writeAuditLog } from "../services/audit.service.js";
import { enqueueNotification } from "../services/notification.service.js";

const notificationEventFor = (collection, action, to) => {
  if (action === "created") {
    return {
      buyEnquiries: "enquiry_created",
      visits: "visit_scheduled",
      sellRequests: "sell_request_submitted",
      callbacks: "callback_requested",
      supportTickets: "support_ticket_created",
      payments: "token_payment_created"
    }[collection];
  }
  return {
    visits: {
      confirmed: "visit_confirmed",
      rescheduled: "visit_rescheduled",
      cancelled: "visit_cancelled"
    },
    sellRequests: {
      approved: "sell_request_approved",
      rejected: "sell_request_rejected",
      changes_requested: "sell_request_change_requested"
    },
    payments: {
      paid: "token_payment_paid",
      failed: "token_payment_failed"
    },
    callbacks: {
      overdue: "callback_overdue",
      resolved: "callback_resolved"
    }
  }[collection]?.[to];
};

const ownerForNotification = (doc) => doc.userId || doc.buyerId || doc.sellerId;
const assertOwner = (doc, actor, ownerField) => {
  if (actor?.type === "customer" && ownerField && String(doc[ownerField]) !== String(actor.id)) throw domainError("You cannot access this resource.");
};

const notifyLifecycle = async ({ collection, action, doc, to }) => {
  const event = notificationEventFor(collection, action, to);
  const userId = ownerForNotification(doc);
  if (!event || !userId) return;
  await enqueueNotification({ userId, event, channel: "in_app", recipient: String(userId), templateId: event, payload: { referenceId: doc.referenceId, status: to || doc.status || doc.stage } });
};

export const createService = ({ collection, repository, workflowField, workflowMap, ownerField }) => ({
  async list(query, actor) {
    const forced = actor?.type === "customer" && ownerField ? { [ownerField]: actor.id } : {};
    return repository.list(query, forced);
  },
  async get(id, actor) {
    const doc = await repository.findById(id);
    assertOwner(doc, actor, ownerField);
    return doc;
  },
  async create(data, actor) {
    const payload = { ...data };
    if (!payload.referenceId) payload.referenceId = makeReferenceId(collection);
    if (actor?.type === "customer" && ownerField && !payload[ownerField]) payload[ownerField] = actor.id;
    const doc = await repository.create(payload);
    await notifyLifecycle({ collection, action: "created", doc });
    return doc;
  },
  async update(id, data, actor, req) {
    const before = await repository.findById(id);
    assertOwner(before, actor, ownerField);
    const doc = await repository.update(id, data);
    await writeAuditLog({ actor, action: `${collection}.updated`, resourceType: collection, resourceId: id, before: before.toObject(), after: doc.toObject(), req });
    return doc;
  },
  async transition(id, to, actor, req, extra = {}) {
    const before = await repository.findById(id);
    assertOwner(before, actor, ownerField);
    if (workflowField && workflowMap) assertTransition(workflowMap, before[workflowField], to);
    if (collection === "properties" && to === "available") validatePropertyPublication({ ...before.toObject(), ...extra });
    if (collection === "properties" && to === "sold" && !extra.closedDealId) throw domainError("Sold status requires a closed sales deal.");
    if (collection === "properties" && before[workflowField] === "sold") requireSuperAdmin(actor, "Reopening a sold property requires super admin approval.");
    const operatorKeys = Object.keys(extra).filter((key) => key.startsWith("$"));
    const plainExtra = Object.fromEntries(Object.entries(extra).filter(([key]) => !key.startsWith("$")));
    const patch = operatorKeys.length ? { ...Object.fromEntries(operatorKeys.map((key) => [key, extra[key]])), $set: { ...plainExtra, [workflowField]: to } } : { ...plainExtra, [workflowField]: to };
    if (collection === "properties" && to === "sold") (patch.$set || patch).soldAt = new Date();
    if (["acquisitions", "salesDeals"].includes(collection)) patch.$push = { ...(patch.$push || {}), stageHistory: { from: before[workflowField], to, changedBy: actor?.id, changedAt: new Date(), notes: extra.notes } };
    const doc = await repository.update(id, patch);
    await writeAuditLog({ actor, action: `${collection}.${workflowField}_changed`, resourceType: collection, resourceId: id, before: before.toObject(), after: doc.toObject(), req });
    await notifyLifecycle({ collection, action: "transition", doc, to });
    return doc;
  },
  async remove(id, actor, req) {
    const before = await repository.findById(id);
    const doc = await repository.softDelete(id, actor?.id);
    await writeAuditLog({ actor, action: `${collection}.deleted`, resourceType: collection, resourceId: id, before: before.toObject(), after: doc.toObject(), req });
    return doc;
  }
});