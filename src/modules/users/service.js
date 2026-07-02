import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
import { missingKycDocuments } from "../../services/complianceRules.service.js";
import { deleteObject, storageKeyFromUrl } from "../../services/storage.service.js";
import { Document } from "../documents/model.js";

const baseService = createService({ collection: "users", repository, workflowField: null, workflowMap: null, ownerField: null });
const PROFILE_FIELDS = ["name", "email", "city", "state", "country", "latitude", "longitude", "userType", "role", "profilePhoto", "assignedTo"];

const rollupKycStatus = (documents = []) => {
  if (!documents.length) return "not_submitted";
  if (documents.some((doc) => doc.status === "rejected")) return "rejected";
  if (documents.every((doc) => doc.status === "verified")) return "verified";
  return "pending";
};

const deletionStatusOf = (user) => {
  const status = user.accountDeletion;
  if (!status) return { status: "none", verificationStatus: "not_started" };
  return typeof status.toObject === "function" ? status.toObject() : status;
};

const deleteReplacedProfilePhoto = async ({ userId, oldUrl, newUrl, actor }) => {
  if (!oldUrl || oldUrl === newUrl) return;
  const key = storageKeyFromUrl(oldUrl);
  if (key) await deleteObject({ key });
  await Document.updateMany(
    {
      ownerType: "user",
      ownerId: userId,
      documentType: "profile_photo",
      isDeleted: { $ne: true },
      ...(oldUrl ? { $or: [{ url: oldUrl }, ...(key ? [{ storageKey: key }] : [])] } : {})
    },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: actor?.id || userId } }
  );
};

export const service = {
  ...baseService,
  async updateProfile(id, data, actor, req) {
    const before = data.profilePhoto !== undefined ? await repository.findById(id) : null;
    const patch = {};
    for (const field of PROFILE_FIELDS) {
      if (data[field] !== undefined) patch[field] = field === "assignedTo" && !data[field] ? null : data[field];
    }
    if (!Object.keys(patch).length) throw domainError("No supported user profile fields were provided.");
    const updated = await baseService.update(id, patch, actor, req);
    if (before && data.profilePhoto !== before.profilePhoto) {
      await deleteReplacedProfilePhoto({ userId: id, oldUrl: before.profilePhoto, newUrl: data.profilePhoto, actor });
    }
    return updated;
  },
  async exportProfile(id, actor) {
    const user = await repository.findById(id);
    const profile = typeof user.toObject === "function" ? user.toObject() : user;
    return {
      exportedAt: new Date(),
      exportedBy: actor?.id || null,
      user: profile
    };
  },
  async getAccountDeletionStatus(id) {
    const user = await repository.findById(id);
    return deletionStatusOf(user);
  },
  async requestAccountDeletion(id, data, actor, req) {
    const user = await repository.findById(id);
    const current = deletionStatusOf(user);
    if (current.status === "requested") throw domainError("Account deletion has already been requested.");
    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const accountDeletion = {
      status: "requested",
      reason: data.reason || null,
      verificationStatus: "pending",
      requestedAt: now,
      scheduledDeletionAt,
      cancelledAt: null,
      completedAt: null,
      lastUpdatedBy: actor.id
    };
    const updated = await baseService.update(id, { accountDeletion }, actor, req);
    return deletionStatusOf(updated);
  },
  async cancelAccountDeletion(id, actor, req) {
    const user = await repository.findById(id);
    const current = deletionStatusOf(user);
    if (current.status !== "requested") throw domainError("There is no active account deletion request to cancel.");
    if (current.scheduledDeletionAt && new Date(current.scheduledDeletionAt).getTime() < Date.now()) throw domainError("The account deletion grace period has expired.");
    const accountDeletion = {
      ...current,
      status: "cancelled",
      verificationStatus: "not_started",
      cancelledAt: new Date(),
      lastUpdatedBy: actor.id
    };
    const updated = await baseService.update(id, { accountDeletion }, actor, req);
    return deletionStatusOf(updated);
  },
  async block(id, data, actor, req) {
    if (data.isBlocked && !data.blockedReason) throw domainError("Blocking a user requires a reason.");
    return baseService.update(id, { isBlocked: data.isBlocked, blockedReason: data.isBlocked ? data.blockedReason : null }, actor, req);
  },
  async assign(id, data, actor, req) {
    if (!data.assignedTo) throw domainError("Assignment requires assignedTo.");
    return baseService.update(id, { assignedTo: data.assignedTo }, actor, req);
  },
  async updateKyc(id, data, actor, req) {
    const user = await repository.findById(id);
    const docs = user.kycDocuments || [];
    for (const update of data.documentUpdates || []) {
      const doc = docs.id?.(update.documentId) || docs.find((item) => String(item._id) === String(update.documentId));
      if (doc) {
        doc.status = update.status;
        doc.rejectionReason = update.rejectionReason;
        if (update.status === "verified") {
          doc.verifiedAt = new Date();
          doc.verifiedBy = actor.id;
        }
      }
    }
    const kycStatus = data.status || rollupKycStatus(docs);
    if (kycStatus === "verified") {
      const missing = missingKycDocuments({ ...user.toObject(), kycDocuments: docs });
      if (missing.length) throw domainError("Required KYC documents are missing.", missing.map((field) => ({ field, message: "Required KYC document is not verified." })));
    }
    if (kycStatus === "rejected" && !data.notes && !docs.some((doc) => doc.rejectionReason)) throw domainError("Rejected KYC requires a rejection reason.");
    return baseService.update(id, { kycDocuments: docs, kycStatus, kycVerifiedAt: kycStatus === "verified" ? new Date() : user.kycVerifiedAt, kycRejectionReason: kycStatus === "rejected" ? data.notes : null }, actor, req);
  },
  async updateFema(id, data, actor, req) {
    const user = await repository.findById(id);
    if (!["nri", "pio"].includes(user.userType)) throw domainError("FEMA compliance applies only to NRI/PIO users.");
    if (!data.status) throw domainError("FEMA status is required.");
    return baseService.update(id, { femaCompliance: { status: data.status, notes: data.notes, checkedBy: actor.id, checkedAt: new Date() } }, actor, req);
  },
  async registerPushToken(id, data, actor, req) {
    const user = await repository.findById(id);
    const devices = [...(user.pushDevices || [])];
    const now = new Date();
    const index = devices.findIndex((device) => device.token === data.token);
    const entry = {
      token: data.token,
      platform: data.platform || "android",
      deviceId: data.deviceId || null,
      updatedAt: now
    };
    if (index >= 0) devices[index] = { ...devices[index], ...entry };
    else devices.push(entry);
    const trimmed = devices
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
    const updated = await baseService.update(id, { pushDevices: trimmed }, actor, req);
    return { registered: true, tokenCount: updated.pushDevices?.length || 0 };
  },
  async removePushToken(id, data, actor, req) {
    const user = await repository.findById(id);
    const pushDevices = (user.pushDevices || []).filter((device) => device.token !== data.token);
    const updated = await baseService.update(id, { pushDevices }, actor, req);
    return { removed: pushDevices.length !== (user.pushDevices || []).length, tokenCount: updated.pushDevices?.length || 0 };
  }
};