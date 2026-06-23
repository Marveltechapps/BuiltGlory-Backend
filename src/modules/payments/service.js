import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { createGatewayOrder, verifyWebhookSignature } from "../../services/payment.service.js";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { SalesDeal } from "../salesDeals/model.js";
import { Property } from "../properties/model.js";
import { conflict, domainError, unauthorized } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";
const baseService = createService({ collection: "payments", repository, workflowField: "status", workflowMap: "paymentStatus", ownerField: "userId" });
export const service = {
  ...baseService,
  async create(data, actor) {
    const idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
      const existing = await repository.findOne({ idempotencyKey, userId: actor?.id });
      if (existing) return existing;
    }
    if (!(Number(data.amount) > 0)) throw domainError("Payment amount must be positive.");
    const deal = data.dealId ? await SalesDeal.findById(data.dealId) : null;
    if (deal && String(deal.buyerId) !== String(actor?.id)) throw domainError("Payment deal does not belong to the customer.");
    const payment = await baseService.create({ ...data, userId: actor?.id, propertyId: data.propertyId || deal?.propertyId, type: data.type || "token", status: "created", idempotencyKey }, actor);
    const gatewayOrder = await createGatewayOrder({ amount: data.amount, currency: data.currency || "INR", receipt: payment.referenceId });
    return repository.update(payment._id, { gatewayOrderId: gatewayOrder.id, providerResponse: gatewayOrder, status: "pending" });
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
    if (payment.gatewayPaymentId && payment.gatewayPaymentId === entity.id) return payment;
    const status = entity.status === "captured" || payload.event === "payment.captured" ? "paid" : entity.status === "failed" ? "failed" : "pending";
    if (Number(entity.amount || payment.amount) !== Number(payment.amount)) throw domainError("Webhook amount does not match payment order.");
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
      return updated;
    } finally {
      await session.endSession();
    }
  }
};