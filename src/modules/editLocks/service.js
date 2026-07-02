import { EditLock } from "./model.js";
import { Admin } from "../admins/model.js";
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
import { forbidden, notFound } from "../../shared/errors/AppError.js";

const DEFAULT_TTL_SECONDS = 30 * 60;
const clean = { isDeleted: { $ne: true } };
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

const serialize = (lock, actor) => {
  if (!lock || lock.releasedAt || new Date(lock.expiresAt).getTime() <= Date.now()) return null;
  return {
    id: String(lock._id),
    entityType: lock.entityType,
    entityId: String(lock.entityId),
    adminId: String(lock.adminId),
    adminName: lock.adminName || "Admin",
    expiresAt: lock.expiresAt,
    lockedAt: lock.createdAt,
    isMine: String(lock.adminId) === String(actor?.id)
  };
};

const actorName = async (actor) => {
  const admin = actor?.id ? await Admin.findById(actor.id).select("name email").lean() : null;
  return admin?.name || admin?.email || "Admin";
};
const hasPermission = (actor, permission) =>
  actor?.role === "super_admin" || actor?.permissions?.includes(permission);
const assertEntityAccess = async (entityType, entityId, actor, mode) => {
  const config = entityConfig[entityType];
  const permission = config?.[mode];
  if (!config || !hasPermission(actor, permission)) throw forbidden();
  const exists = await config.Model.exists({ _id: entityId, ...clean });
  if (!exists) throw notFound("Lock entity not found.");
};

export const service = {
  async get(entityType, entityId, actor) {
    await assertEntityAccess(entityType, entityId, actor, "read");
    const lock = await EditLock.findOne({ entityType, entityId, releasedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).lean();
    return serialize(lock, actor);
  },

  async claim(entityType, entityId, actor, { ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
    await assertEntityAccess(entityType, entityId, actor, "write");
    const now = new Date();
    const existing = await EditLock.findOne({ entityType, entityId, releasedAt: { $exists: false }, expiresAt: { $gt: now } });
    if (existing && String(existing.adminId) !== String(actor?.id)) return serialize(existing, actor);
    const expiresAt = new Date(now.getTime() + Number(ttlSeconds) * 1000);
    const lock = await EditLock.findOneAndUpdate(
      { entityType, entityId },
      { entityType, entityId, adminId: actor.id, adminName: await actorName(actor), expiresAt, $unset: { releasedAt: "" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return serialize(lock, actor);
  },

  async release(entityType, entityId, actor) {
    await assertEntityAccess(entityType, entityId, actor, "write");
    await EditLock.updateOne({ entityType, entityId, adminId: actor.id, releasedAt: { $exists: false } }, { releasedAt: new Date(), expiresAt: new Date() });
    return { released: true };
  }
};
