import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { User } from "../users/model.js";
import { domainError } from "../../shared/errors/AppError.js";
import { assertMandatoryDocuments, SELLER_DOCUMENT_CHECKLIST } from "../../services/legalDocumentRules.service.js";
const baseService = createService({ collection: "sellRequests", repository, workflowField: "status", workflowMap: "sellRequestStatus", ownerField: "sellerId" });
const validateSubmission = (data, seller) => {
  const missing = [];
  if (!["seller", "both"].includes(seller.role)) missing.push("role");
  if (!data.propertyType) missing.push("propertyType");
  if (!data.propertyTitle) missing.push("propertyTitle");
  if (!data.address?.pincode || !/^\d{6}$/.test(String(data.address.pincode))) missing.push("address.pincode");
  if (!data.address?.city) missing.push("address.city");
  if (!(Number(data.askingPrice) > 0)) missing.push("askingPrice");
  if (!data.ownershipType) missing.push("ownershipType");
  const photoCount = data.photosCount || data.photos?.length || 0;
  if (photoCount < 5) missing.push("photos");
  if (data.loanOnProperty && !data.loanDetails) missing.push("loanDetails");
  if (missing.length) throw domainError("Sell request submission is incomplete.", missing.map((field) => ({ field, message: "Required for submission." })));
};
export const service = {
  ...baseService,
  async create(data, actor) {
    const seller = await User.findById(actor?.id);
    if (!seller || seller.isBlocked) throw domainError("Blocked or inactive sellers cannot create sell requests.");
    const isDraft = data.isDraft || data.status === "draft";
    if (!isDraft) validateSubmission(data, seller);
    return baseService.create({
      ...data,
      sellerId: seller._id,
      sellerSnapshot: { name: seller.name, phone: seller.phone, email: seller.email, userType: seller.userType, kycStatus: seller.kycStatus },
      status: isDraft ? "draft" : "new",
      isDraft,
      draftSavedAt: isDraft ? new Date() : data.draftSavedAt,
      submittedAt: isDraft ? undefined : new Date(),
      photosCount: data.photosCount || data.photos?.length || 0,
      documentsCount: data.documentsCount || data.documents?.length || 0
    }, actor);
  },
  async transition(id, to, actor, req, extra = {}) {
    const before = await repository.findById(id);
    if (to === "new") {
      const seller = await User.findById(before.sellerId);
      validateSubmission({ ...before.toObject(), ...extra }, seller);
      extra.isDraft = false;
      extra.submittedAt = new Date();
    }
    if (["approved", "active"].includes(to)) {
      const seller = await User.findById(before.sellerId);
      if (seller?.kycStatus !== "verified") throw domainError("Seller KYC must be verified before approval or activation.");
      assertMandatoryDocuments({ documents: before.documents || [], checklist: SELLER_DOCUMENT_CHECKLIST, action: "sell request approval" });
    }
    if (to === "rejected" && !extra.rejectionReason && !extra.reason) throw domainError("Rejection requires a reason.");
    if (to === "changes_requested" && !(extra.changeRequests || []).length) throw domainError("Changes requested requires at least one change note.");
    return baseService.transition(id, to, actor, req, extra);
  },
  async update(id, data, actor, req) {
    const before = await repository.findById(id);
    if (actor?.type === "customer") {
      if (String(before.sellerId) !== String(actor.id)) throw domainError("You cannot edit this sell request.");
      if (!["draft", "changes_requested"].includes(before.status)) throw domainError("Seller can edit only draft or change-requested sell requests.");
    }
    return baseService.update(id, data, actor, req);
  }
};