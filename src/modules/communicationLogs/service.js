import { CommunicationLog } from "./model.js";
import { makeReferenceId } from "../../shared/id.js";
import { getPagination, paginationMeta } from "../../shared/pagination.js";
import { domainError, forbidden, notFound } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { enqueueInAppAndPush } from "../../services/notification.service.js";
import { resolveDashboardNotificationTarget } from "../../services/workflowPush.service.js";
import { buildCanonicalNotificationFields } from "../../constants/notificationCatalog.js";
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
  buy_enquiry: { Model: BuyEnquiry, read: "enquiries.read", write: "enquiries.write", userField: "buyerId" },
  sell_request: { Model: SellRequest, read: "enquiries.read", write: "enquiries.write", userField: "sellerId" },
  acquisition: { Model: Acquisition, read: "acquisitions.read", write: "acquisitions.write", userField: "sellerId" },
  sales_deal: { Model: SalesDeal, read: "sales.read", write: "sales.write", userField: "buyerId" },
  visit: { Model: Visit, read: "enquiries.read", write: "enquiries.write", userField: "buyerId" },
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

  async sendEmail({ entityType, entityId, body }, actor, req) {
    await assertEntityAccess(entityType, entityId, actor, "write");
    if (!body.to) throw domainError("Recipient email is required.");
    if (!body.subject?.trim()) throw domainError("Email subject is required.");
    if (!body.body?.trim()) throw domainError("Email body is required.");
    const { sendTransactionalEmail } = await import("../auth/email.service.js");
    await sendTransactionalEmail({
      to: body.to,
      subject: body.subject.trim(),
      body: body.body.trim(),
      from: body.from
    });
    return this.create({
      entityType,
      entityId,
      channel: "email",
      direction: "outbound",
      summary: body.summary || `Email sent to ${body.to}`,
      body: body.body.trim(),
      outcome: body.to
    }, actor, req);
  },

  async sendPush({ entityType, entityId, body }, actor, req) {
    await assertEntityAccess(entityType, entityId, actor, "write");
    const config = entityConfig[entityType];
    const entity = config?.Model ? await config.Model.findById(entityId).lean() : null;
    const resolvedUserId = body.userId || (entity && config?.userField ? entity[config.userField] : null);
    const dedupeKey = body.dedupeKey || `${body.notificationId}:${resolvedUserId || body.recipient}:${body.template.title}`;
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

    const sellerEntity = ["sell_request", "acquisition"].includes(entityType);
    const audience = body.audience || (sellerEntity ? "seller" : "buyer");
    const target = resolveDashboardNotificationTarget({
      notificationId: body.notificationId,
      audience,
      deepLink: body.template?.deepLink
    });
    const canonical = buildCanonicalNotificationFields({
      notificationType: target.notificationType || body.notificationId,
      audience,
      entityId,
      entityType,
      deepLink: target.deepLink || body.template?.deepLink,
      title: body.template.title,
      body: body.template.body,
      image: body.image || entity?.propertySnapshot?.coverImage || entity?.coverImage || "",
      screen: target.screen,
      screenKey: target.screenKey
    });

    const notification = resolvedUserId ? await enqueueInAppAndPush({
      userId: resolvedUserId,
      adminId: actor?.id,
      event: "admin_push",
      recipient: body.recipient || resolvedUserId,
      templateId: body.notificationId,
      payload: {
        title: canonical.title,
        message: canonical.body,
        body: canonical.body,
        route: canonical.deepLink,
        deepLink: canonical.deepLink,
        screenKey: canonical.screenKey,
        screen: canonical.screen,
        notificationType: canonical.notificationType,
        type: canonical.notificationType,
        entityType: canonical.entityType,
        entityId: canonical.entityId,
        image: canonical.image,
        createdAt: canonical.createdAt,
        audience: canonical.audience,
        listingId: entityType === "sell_request" ? String(entityId) : String(entity?.sellRequestId || ""),
        sellRequestId: entityType === "sell_request" ? String(entityId) : String(entity?.sellRequestId || ""),
        enquiryId: entityType === "buy_enquiry" ? String(entityId) : String(entity?.enquiryId || entity?.sourceEnquiryId || ""),
        dealId: entityType === "sales_deal" ? String(entityId) : String(entity?.dealId || ""),
        propertyId: String(entity?.propertyId || "")
      },
      dedupeKey,
      title: canonical.title,
      message: canonical.body,
      notificationType: canonical.notificationType,
      listingId: entityType === "sell_request" ? String(entityId) : String(entity?.sellRequestId || ""),
      enquiryId: entityType === "buy_enquiry" ? String(entityId) : String(entity?.enquiryId || entity?.sourceEnquiryId || ""),
      dealId: entityType === "sales_deal" ? String(entityId) : String(entity?.dealId || ""),
      propertyId: String(entity?.propertyId || ""),
      screen: canonical.screen,
      entityId: canonical.entityId,
      entityType: canonical.entityType,
      image: canonical.image
    }) : { inApp: null, push: null };
    const inApp = notification.inApp;
    const pushNotification = notification.push;
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
