import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { domainError } from "../../shared/errors/AppError.js";
import { missingKycDocuments } from "../../services/complianceRules.service.js";

const baseService = createService({ collection: "users", repository, workflowField: null, workflowMap: null, ownerField: null });

const rollupKycStatus = (documents = []) => {
  if (!documents.length) return "not_submitted";
  if (documents.some((doc) => doc.status === "rejected")) return "rejected";
  if (documents.every((doc) => doc.status === "verified")) return "verified";
  return "pending";
};

export const service = {
  ...baseService,
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
  }
};