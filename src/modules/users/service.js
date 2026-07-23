import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { conflict, domainError } from "../../shared/errors/AppError.js";
import { missingKycDocuments } from "../../services/complianceRules.service.js";
import { deleteObject, storageKeyFromUrl } from "../../services/storage.service.js";
import { Document } from "../documents/model.js";
import { logger } from "../../config/logger.js";
import { User } from "./model.js";

const baseService = createService({ collection: "users", repository, workflowField: null, workflowMap: null, ownerField: null });
const PROFILE_FIELDS = ["name", "email", "city", "state", "country", "latitude", "longitude", "userType", "role", "profilePhoto", "assignedTo"];
const SPARSE_UNIQUE_CONTACT_FIELDS = ["email", "mobileNumber", "phoneNormalized", "phone"];

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const normalizeProfilePhoneFields = (data = {}) => {
  const patch = { ...data };
  const rawPhone = patch.mobileNumber ?? patch.phone ?? patch.phoneNormalized;
  if (rawPhone === undefined) return patch;

  if (rawPhone === null || rawPhone === "") {
    patch.phone = null;
    patch.mobileNumber = null;
    patch.phoneNormalized = null;
    return patch;
  }

  const digits = digitsOnly(rawPhone);
  const localNumber = digits.length > 10 && digits.startsWith("91") ? digits.slice(-10) : digits;
  if (!/^\d{10}$/.test(localNumber)) {
    throw domainError("Phone number must be a valid 10-digit Indian mobile number.", [
      { field: "mobileNumber", message: "Enter a valid 10-digit phone number." }
    ]);
  }

  patch.mobileNumber = localNumber;
  patch.phoneNormalized = `91${localNumber}`;
  patch.phone = `+91 ${localNumber}`;
  return patch;
};

/**
 * Sparse unique indexes treat explicit `null` as a real indexed value.
 * Clearing a contact field must $unset it; otherwise the second user who
 * saves `email: null` (or phone: null) gets an E11000 duplicate-key error.
 */
const buildProfileMongoUpdate = (data = {}) => {
  const $set = {};
  const $unset = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (SPARSE_UNIQUE_CONTACT_FIELDS.includes(key) && (value === null || value === "")) {
      $unset[key] = "";
      continue;
    }
    if (key === "email" && typeof value === "string") {
      $set.email = value.trim().toLowerCase();
      continue;
    }
    $set[key] = value;
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  return update;
};

const assertUniqueContactFields = async (userId, patch) => {
  const checks = [];
  if (patch.email) {
    checks.push({
      field: "email",
      filter: { email: String(patch.email).toLowerCase().trim(), _id: { $ne: userId } },
      message: "This email is already registered to another account."
    });
  }
  if (patch.mobileNumber || patch.phoneNormalized) {
    const mobileNumber = patch.mobileNumber || digitsOnly(patch.phoneNormalized).slice(-10);
    const phoneNormalized = patch.phoneNormalized || `91${mobileNumber}`;
    checks.push({
      field: "mobileNumber",
      filter: {
        _id: { $ne: userId },
        $or: [
          { mobileNumber },
          { phoneNormalized },
          { phone: mobileNumber },
          { phone: `+91 ${mobileNumber}` }
        ]
      },
      message: "This phone number is already registered to another account. Sign in with that phone number instead."
    });
  }

  for (const check of checks) {
    const existing = await User.findOne(check.filter).select("_id email mobileNumber phoneNormalized");
    if (existing) {
      logger.warn({
        event: "user_profile_unique_conflict",
        userId: String(userId),
        field: check.field,
        conflictingUserId: String(existing._id)
      });
      throw conflict(check.message, [{ field: check.field, message: check.message }]);
    }
  }
};

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
  async update(id, data, actor, req) {
    const beforePhoto = data.profilePhoto !== undefined ? await repository.findById(id) : null;
    const normalized = normalizeProfilePhoneFields(data);
    const mongoUpdate = buildProfileMongoUpdate(normalized);
    const setFields = mongoUpdate.$set || {};
    logger.info({
      event: "user_profile_update_start",
      userId: String(id),
      fields: [
        ...Object.keys(setFields),
        ...Object.keys(mongoUpdate.$unset || {}).map((key) => `unset:${key}`)
      ]
    });
    if (!Object.keys(mongoUpdate).length) {
      throw domainError("No profile fields were provided to update.");
    }
    await assertUniqueContactFields(id, { ...setFields });
    const updated = await baseService.update(id, mongoUpdate, actor, req);
    if (beforePhoto && data.profilePhoto !== beforePhoto.profilePhoto) {
      await deleteReplacedProfilePhoto({ userId: id, oldUrl: beforePhoto.profilePhoto, newUrl: data.profilePhoto, actor });
    }
    logger.info({ event: "user_profile_update_success", userId: String(id) });
    return updated;
  },
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