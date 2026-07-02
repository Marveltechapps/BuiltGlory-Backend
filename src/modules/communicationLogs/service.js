import { CommunicationLog } from "./model.js";
import { makeReferenceId } from "../../shared/id.js";
import { getPagination, paginationMeta } from "../../shared/pagination.js";
import { domainError, forbidden, notFound } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { enqueueNotification } from "../../services/notification.service.js";
import { scanBuffer, uploadBuffer, validateUpload } from "../../services/storage.service.js";
import { Property } from "../properties/model.js";
import { User } from "../users/model.js";
import { BuyEnquiry } from "../buyEnquiries/model.js";
import { SellRequest } from "../sellRequests/model.js";
import { Acquisition } from "../acquisitions/model.js";
import { SalesDeal } from "../salesDeals/model.js";
import { Visit } from "../visits/model.js";
import { Callback } from "../callbacks/model.js";
import { InteriorLead } from "../interiorLeads/model.js";
import { SupportTicket } from "../supportTickets/model.js";

const entityConfig = {
  buy_enquiry: { Model: BuyEnquiry, read: "enquiries.read", write: "enquiries.write" },
  sell_request: { Model: SellRequest, read: "enquiries.read", write: "enquiries.write" },
  acquisition: { Model: Acquisition, read: "acquisitions.read", write: "acquisitions.write" },
  sales_deal: { Model: SalesDeal, read: "sales.read", write: "sales.write" },
  visit: { Model: Visit, read: "visits.read", write: "visits.write" },
  callback: { Model: Callback, read: "enquiries.read", write: "enquiries.write" },
  interior_lead: { Model: InteriorLead, read: "enquiries.read", write: "enquiries.write" },
  support_ticket: { Model: SupportTicket, read: "support.read", write: "support.write" },
  user: { Model: User, read: "users.read", write: "users.read" },
  property: { Model: Property, read: "properties.read", write: "properties.write" }
};

const clean = { isDeleted: { $ne: true } };
const recentPushKeys = new Map();

const hasPermission = (actor, permission) =>
  actor?.role === "super_admin" || actor?.permissions?.includes(permission);

const readableEntityTypes = (actor) =>
  Object.entries(entityConfig)
    .filter(([, config]) => hasPermission(actor, config.read))
    .map(([entityType]) => entityType);

const assertEntityAccess = async (entityType, entityId, actor, mode) => {
  const config = entityConfig[entityType];
  const permission = config?.[mode];
  if (!config || !hasPermission(actor, permission)) throw forbidden();
  const exists = await config.Model.exists({ _id: entityId, ...clean });
  if (!exists) throw notFound("Timeline entity not found.");
};

const storageKeyFor = ({ entityType, entityId, fileName }) =>
  `workflow-proofs/${entityType}/${entityId}/${Date.now()}-${String(fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;

const isDuplicatePush = (key, windowMs = 30 * 60 * 1000) => {
  if (!key) return false;
  const last = recentPushKeys.get(key);
  if (last && Date.now() - last < windowMs) return true;
  recentPushKeys.set(key, Date.now());
  return false;
};

export const service = {
  async list(query = {}, actor) {
    const { page, limit, skip } = getPagination(query);
    const allowedEntityTypes = readableEntityTypes(actor);
    if (allowedEntityTypes.length === 0) throw forbidden();
    const filter = {
      isDeleted: { $ne: true },
      entityType: query.entityType ? query.entityType : { $in: allowedEntityTypes }
    };
    if (query.entityType && !allowedEntityTypes.includes(query.entityType)) throw forbidden();
    if (query.entityId) filter.entityId = query.entityId;
    if (query.channel) filter.channel = Array.isArray(query.channel) ? { $in: query.channel } : query.channel;
    if (query.direction) filter.direction = query.direction;
    if (query.search) {
      const search = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ summary: search }, { body: search }, { outcome: search }];
    }
    const [logs, total] = await Promise.all([
      CommunicationLog.find(filter).sort({ occurredAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      CommunicationLog.countDocuments(filter)
    ]);
    return { data: logs, meta: paginationMeta(page, limit, total) };
  },

  async create(data, actor, req) {
    await assertEntityAccess(data.entityType, data.entityId, actor, "write");
    const payload = {
      ...data,
      referenceId: makeReferenceId("communicationLogs"),
      actorType: actor?.type || "admin",
      actorId: actor?.id,
      occurredAt: data.occurredAt || new Date()
    };
    const doc = await CommunicationLog.create(payload);
    await writeAuditLog({
      actor,
      action: "communicationLogs.created",
      resourceType: "communicationLogs",
      resourceId: doc._id,
      after: doc.toObject(),
      req
    });
    return doc;
  },

  async createForEntity({ entityType, entityId, body }, actor, req) {
    return this.create({ ...body, entityType, entityId }, actor, req);
  },

  async createProofUpload({ entityType, entityId, file, body = {} }, actor, req) {
    if (!file) throw domainError("A proof file is required.");
    await assertEntityAccess(entityType, entityId, actor, "write");
    const storageKey = storageKeyFor({ entityType, entityId, fileName: file.originalname });
    validateUpload({ purpose: "payment_proof", mimeType: file.mimetype, sizeBytes: file.size });
    const scan = await scanBuffer({ buffer: file.buffer, mimeType: file.mimetype });
    if (scan.status === "infected") throw domainError("Uploaded proof failed malware scanning.");
    const url = await uploadBuffer({
      key: storageKey,
      mimeType: file.mimetype,
      buffer: file.buffer,
      quarantine: scan.status !== "clean"
    });
    return this.create({
      entityType,
      entityId,
      channel: "proof_upload",
      direction: "internal",
      summary: body.summary || `Proof uploaded: ${file.originalname}`,
      body: body.notes,
      outcome: scan.status === "clean" ? "uploaded" : "scan_pending",
      attachments: [{
        fileName: file.originalname,
        url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey
      }]
    }, actor, req);
  },

  async sendPush({ entityType, entityId, body }, actor, req) {
    await assertEntityAccess(entityType, entityId, actor, "write");
    const dedupeKey = body.dedupeKey || `${body.notificationId}:${body.userId || body.recipient}:${body.template.title}`;
    if (!body.skipDuplicateCheck && isDuplicatePush(dedupeKey)) {
      return this.create({
        entityType,
        entityId,
        channel: "push",
        direction: "outbound",
        summary: `Duplicate push skipped: ${body.template.title}`,
        body: body.template.body,
        outcome: "deduplicated"
      }, actor, req);
    }
    const notification = body.userId ? await enqueueNotification({
      userId: body.userId,
      event: "admin_push",
      channel: "in_app",
      recipient: body.recipient || body.userId,
      templateId: body.notificationId,
      payload: {
        title: body.template.title,
        message: body.template.body,
        route: body.template.deepLink,
        deepLink: body.template.deepLink,
        entityType,
        entityId
      }
    }) : null;
    const pushNotification = body.userId ? await enqueueNotification({
      userId: body.userId,
      event: "admin_push",
      channel: "push",
      recipient: body.recipient || String(body.userId),
      templateId: body.notificationId,
      payload: {
        title: body.template.title,
        body: body.template.body,
        message: body.template.body,
        deepLink: body.template.deepLink,
        entityType,
        entityId
      }
    }) : null;
    const pushOutcome = pushNotification
      ? pushNotification.status === "sent"
        ? `sent:${pushNotification.referenceId}`
        : `failed:${pushNotification.referenceId}:${pushNotification.failureReason || "unknown"}`
      : null;
    return this.create({
      entityType,
      entityId,
      channel: "push",
      direction: "outbound",
      summary: pushNotification?.status === "sent" ? `Push sent: ${body.template.title}` : `Push queued: ${body.template.title}`,
      body: body.template.body,
      outcome: notification || pushNotification
        ? [notification ? `in_app:${notification.referenceId}` : null, pushOutcome].filter(Boolean).join(",")
        : "logged_without_user_id"
    }, actor, req);
  },

  async timeline({ entityType, entityId, query = {} }, actor) {
    await assertEntityAccess(entityType, entityId, actor, "read");
    const { page, limit, skip } = getPagination(query);
    const filter = { entityType, entityId, isDeleted: { $ne: true } };
    if (query.channel) filter.channel = query.channel;
    const [logs, total] = await Promise.all([
      CommunicationLog.find(filter).sort({ occurredAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      CommunicationLog.countDocuments(filter)
    ]);
    return { data: logs, meta: paginationMeta(page, limit, total) };
  },

  async remove(id, actor, req) {
    const before = await CommunicationLog.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!before) throw notFound("Communication log not found.");
    await assertEntityAccess(before.entityType, before.entityId, actor, "write");
    const doc = await CommunicationLog.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy: actor?.id }, { new: true });
    await writeAuditLog({
      actor,
      action: "communicationLogs.deleted",
      resourceType: "communicationLogs",
      resourceId: id,
      before: before.toObject(),
      after: doc.toObject(),
      req
    });
    return doc;
  }
};
