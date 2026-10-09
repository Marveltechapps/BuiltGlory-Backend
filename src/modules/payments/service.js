import { createService, notifyLifecycle } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { verifyWebhookSignature } from "../../services/payment.service.js";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { SalesDeal } from "../salesDeals/model.js";
import { Property } from "../properties/model.js";
import { Document } from "../documents/model.js";
import { service as adminSettingsService } from "../adminSettings/service.js";
import { conflict, domainError, unauthorized } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";

const baseService = createService({ collection: "payments", repository, workflowField: "status", workflowMap: "paymentStatus", ownerField: "userId" });
const confirmableStatuses = new Set(["created", "pending"]);
const manualMethods = new Set(["bank", "upi", "cheque", "cash"]);
const dealMethodMap = { bank: "neft", upi: "upi", cheque: "cheque", cash: "cash", neft: "neft" };

const amountMatches = (webhookAmount, storedAmount) => {
  const rupees = Number(storedAmount);
  const paise = Math.round(rupees * 100);
  return Number(webhookAmount) === rupees || Number(webhookAmount) === paise;
};

const isManualPayment = (payment) =>
  payment?.gateway === "escrow" || manualMethods.has(payment?.method);

const snapshotTokenPayment = (payment, extra = {}) => ({
  amount: payment.amount,
  method: dealMethodMap[payment.method] || payment.method || "cash",
  paymentDate: new Date().toISOString().slice(0, 10),
  reference: payment.transactionReference || extra.reference || null,
  proofUrl: payment.proofUrl || extra.proofUrl || null,
  proofDocumentId: payment.proofDocumentId || extra.proofDocumentId || null,
  notes: extra.notes || payment.verificationNotes || payment.notes || "",
  paymentId: String(payment._id),
  verifiedBy: extra.verifiedBy || payment.verifiedBy || null,
  verifiedAt: extra.verifiedAt || payment.verifiedAt || new Date()
});

const assertProofDocument = async ({ proofDocumentId, dealId, actor }) => {
  if (!proofDocumentId) return null;
  const doc = await Document.findOne({ _id: proofDocumentId, isDeleted: { $ne: true } });
  if (!doc) throw domainError("Payment proof was not found.");
  const ownerOk =
    (doc.ownerType === "sales_deal" && String(doc.ownerId) === String(dealId)) ||
    (doc.ownerType === "user" && String(doc.ownerId) === String(actor?.id)) ||
    (doc.ownerType === "payment" && String(doc.uploadedBy) === String(actor?.id));
  if (!ownerOk) throw domainError("Payment proof does not belong to this deal.");
  if (doc.purpose !== "payment_proof") throw domainError("Document is not a payment proof.");
  return doc;
};

const markDealTokenPaid = async ({ payment, actor, notes, session }) => {
  const verifiedAt = new Date();
  const dealPatch = {
    $inc: { "financials.totalPaid": payment.amount },
    $set: {
      lastActivityAt: verifiedAt,
      "financials.tokenPaid": true,
      "financials.tokenAmount": payment.amount,
      "financials.tokenPayment": snapshotTokenPayment(payment, {
        notes,
        verifiedBy: actor?.id,
        verifiedAt
      })
    }
  };
  await SalesDeal.findByIdAndUpdate(payment.dealId, dealPatch, session ? { session } : undefined);
  if (payment.propertyId) {
    await Property.findByIdAndUpdate(payment.propertyId, { status: "reserved" }, session ? { session } : undefined);
  }
  return verifiedAt;
};

export const confirmDealPaymentsFromAdmin = async ({ dealId, type, actor, req, notes }) => {
  if (!dealId) return [];
  const filter = { dealId, isDeleted: { $ne: true }, status: { $in: [...confirmableStatuses] } };
  if (type) filter.type = type;
  const pending = await repository.Model.find(filter).sort({ createdAt: -1 });
  const confirmed = [];
  const verifiedAt = new Date();
  for (const payment of pending) {
    if (!confirmableStatuses.has(payment.status)) continue;
    const updated = await baseService.transition(payment._id, "paid", actor || { type: "admin" }, req, {
      paidAt: verifiedAt,
      verifiedBy: actor?.id,
      verifiedAt,
      verificationNotes: notes || "Confirmed by admin after manual verification."
    });
    confirmed.push(updated);
  }
  return confirmed;
};

export const service = {
  ...baseService,
  async create(data, actor) {
    if (!(Number(data.amount) > 0)) throw domainError("Payment amount must be positive.");
    const deal = data.dealId ? await SalesDeal.findById(data.dealId) : null;
    if (deal && String(deal.buyerId) !== String(actor?.id)) throw domainError("Payment deal does not belong to the customer.");
    const type = data.type || "token";
    const method = manualMethods.has(data.method) ? data.method : "bank";
    const openPayment = await repository.findOne({ dealId: data.dealId, userId: actor?.id, type, status: { $in: ["created", "pending"] } });
    if (openPayment) return openPayment;
    const paidPayment = await repository.findOne({ dealId: data.dealId, userId: actor?.id, type, status: "paid" });
    if (paidPayment) return paidPayment;
    let idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
      const existing = await repository.findOne({ idempotencyKey, userId: actor?.id });
      if (existing && ["created", "pending", "paid"].includes(existing.status)) return existing;
      if (existing && ["failed", "cancelled", "rejected"].includes(existing.status)) {
        idempotencyKey = `${idempotencyKey}-retry-${Date.now()}`;
      }
    }
    let amount = Number(data.amount);
    if (type === "token") {
      const settings = await adminSettingsService.get();
      const expectedAmount = Number(settings.payment?.tokenAmount ?? 250000);
      if (expectedAmount > 0 && amount !== expectedAmount) throw domainError("Token payment amount must match configured token amount.");
      amount = expectedAmount;
    }
    const proof = await assertProofDocument({ proofDocumentId: data.proofDocumentId, dealId: data.dealId, actor });
    const payment = await baseService.create({
      ...data,
      amount,
      userId: actor?.id,
      propertyId: data.propertyId || deal?.propertyId,
      type,
      method,
      gateway: "escrow",
      status: "created",
      transactionReference: String(data.transactionReference || "").trim(),
      proofDocumentId: proof?._id || (data.proofDocumentId ? data.proofDocumentId : undefined),
      proofUrl: proof?.url || "",
      notes: String(data.notes || "").trim(),
      submittedAt: new Date(),
      idempotencyKey
    }, actor);
    return repository.update(payment._id, { status: "pending" });
  },
  async cancel(id, actor, req) {
    const payment = await repository.findById(id);
    if (String(payment.userId) !== String(actor?.id)) throw domainError("You cannot cancel this payment.");
    if (!confirmableStatuses.has(payment.status)) throw domainError("Only pending payments can be cancelled.");
    return baseService.transition(id, "cancelled", actor, req, { failureReason: "Cancelled by customer." });
  },
  async verify(id, { decision, notes } = {}, actor, req) {
    if (actor?.type !== "admin") throw unauthorized("Admin access is required to verify payments.");
    const payment = await repository.findById(id);
    if (!confirmableStatuses.has(payment.status)) throw domainError("Only pending payments can be verified.");
    const verificationNotes = String(notes || "").trim();
    if (decision === "rejected") {
      if (!verificationNotes) throw domainError("A rejection reason is required.");
      return baseService.transition(id, "rejected", actor, req, {
        verificationNotes,
        verifiedBy: actor.id,
        verifiedAt: new Date(),
        rejectedAt: new Date(),
        failureReason: verificationNotes
      });
    }
    if (decision !== "paid") throw domainError("Decision must be paid or rejected.");
    const verifiedAt = new Date();
    const updated = await baseService.transition(id, "paid", actor, req, {
      paidAt: verifiedAt,
      verifiedBy: actor.id,
      verifiedAt,
      verificationNotes: verificationNotes || "Verified by admin after manual confirmation."
    });
    if (payment.dealId) {
      await markDealTokenPaid({
        payment: updated,
        actor,
        notes: verificationNotes || "Verified by admin after manual confirmation."
      });
    }
    return updated;
  },
  async recordAdminOffline({ dealId, amount, method, reference, proofUrl, proofDocumentId, notes }, actor, req) {
    if (actor?.type !== "admin") throw unauthorized("Admin access is required to record offline payments.");
    const deal = await SalesDeal.findById(dealId);
    if (!deal) throw domainError("Sales deal was not found.");
    const existingPaid = await repository.findOne({ dealId, type: "token", status: "paid" });
    if (existingPaid) return existingPaid;
    const verifiedAt = new Date();
    const paymentMethod = manualMethods.has(method) || method === "neft" ? (method === "neft" ? "bank" : method) : "cash";
    const payment = await baseService.create({
      userId: deal.buyerId,
      dealId: deal._id,
      propertyId: deal.propertyId,
      type: "token",
      amount: Number(amount) || Number(deal.financials?.tokenAmount) || 0,
      currency: "INR",
      method: paymentMethod,
      gateway: "escrow",
      status: "paid",
      transactionReference: String(reference || "").trim(),
      proofDocumentId: proofDocumentId || undefined,
      proofUrl: proofUrl || "",
      notes: String(notes || "").trim(),
      submittedAt: verifiedAt,
      paidAt: verifiedAt,
      verifiedBy: actor.id,
      verifiedAt,
      verificationNotes: String(notes || "").trim() || "Recorded by admin for in-person / offline payment."
    }, actor);
    await writeAuditLog({
      actor,
      action: "payments.status_changed",
      resourceType: "payments",
      resourceId: payment._id,
      before: { status: "created" },
      after: payment.toObject?.() || payment,
      req
    });
    return payment;
  },
  async handleWebhook({ rawBody, signature, req }) {
    if (!verifyWebhookSignature(rawBody, signature)) throw unauthorized("Invalid payment webhook signature.");
    const payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody);
    const providerEventId = payload.event_id || payload.id;
    const providerEventAt = payload.created_at ? new Date(Number(payload.created_at) * 1000) : new Date();
    if (!providerEventId) throw unauthorized("Payment webhook event id is required.");
    if (Math.abs(Date.now() - providerEventAt.getTime()) > Number(env.WEBHOOK_TOLERANCE_SECONDS) * 1000) throw unauthorized("Payment webhook timestamp is outside the allowed window.");
    const existingEvent = await repository.findOne({ providerEventId });
    if (existingEvent) throw conflict("Duplicate payment webhook event.");
    const entity = payload.payload?.payment?.entity || payload.payment || payload;
    const orderId = entity.order_id || entity.gatewayOrderId;
    const payment = await repository.findOne({ gatewayOrderId: orderId });
    if (!payment) throw domainError("Payment order not found.");
    if (isManualPayment(payment)) throw domainError("Manual payments cannot be confirmed by webhook.");
    if (payment.gatewayPaymentId && payment.gatewayPaymentId === entity.id) return payment;
    const status = entity.status === "captured" || payload.event === "payment.captured" ? "paid" : entity.status === "failed" ? "failed" : "pending";
    if (!amountMatches(entity.amount || payment.amount, payment.amount)) throw domainError("Webhook amount does not match payment order.");
    if ((entity.currency || payment.currency) !== payment.currency) throw domainError("Webhook currency does not match payment order.");
    const patch = { status, gatewayPaymentId: entity.id, gatewaySignature: signature, providerEventId, providerEventAt, providerResponse: payload };
    if (status === "paid") patch.paidAt = new Date();
    if (status === "failed") patch.failureReason = entity.error_description || entity.error_reason;
    const session = await mongoose.startSession();
    try {
      let updated;
      await session.withTransaction(async () => {
        updated = await repository.update(payment._id, patch, { session });
        if (status === "paid" && payment.dealId) {
          const dealPatch = { $inc: { "financials.totalPaid": payment.amount } };
          if (payment.type === "token") dealPatch.$set = { "financials.tokenPaid": true };
          await SalesDeal.findByIdAndUpdate(payment.dealId, dealPatch, { session });
          if (payment.type === "token") await Property.findByIdAndUpdate(payment.propertyId, { status: "reserved" }, { session });
        }
        await writeAuditLog({ actor: { type: "system" }, action: "payment.status_changed", resourceType: "payment", resourceId: payment._id, before: payment.toObject(), after: updated.toObject(), req }, { session });
      });
      if (updated && (status === "paid" || status === "failed")) {
        await notifyLifecycle({ collection: "payments", action: "transition", doc: updated, to: status });
      }
      return updated;
    } finally {
      await session.endSession();
    }
  }
};
