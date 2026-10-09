import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { createValidator, listValidator, updateValidator, statusValidator } from "./validator.js";
const router = Router();
router.get("/admin/sales/deals", authenticate("admin"), requirePermission("sales.read"), validate(listValidator), controller.list);
router.post("/admin/sales/deals", authenticate("admin"), requirePermission("sales.write"), validate(createValidator), controller.create);
router.get("/admin/sales/deals/:dealId", authenticate("admin"), requirePermission("sales.read"), controller.get);
router.patch("/admin/sales/deals/:dealId", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.update);
router.get("/admin/sales/deals/:dealId/recommendations", authenticate("admin"), requirePermission("sales.read"), validate(listValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.recommendations(req.params.dealId, req.query || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/stage", authenticate("admin"), requirePermission("sales.write"), validate(statusValidator), controller.transition("stage"));
router.patch("/admin/sales/deals/:dealId/offer", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const patch = { $set: { lastActivityAt: new Date() } };
  if (req.body.offeredPrice !== undefined) patch.$set["financials.offeredPrice"] = req.body.offeredPrice;
  if (req.body.agreedPrice !== undefined) patch.$set["financials.agreedPrice"] = req.body.agreedPrice;
  const data = await import("./service.js").then((m) => m.service.update(req.params.dealId, patch, req.actor, req));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/token-payment", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const patch = { $set: { lastActivityAt: new Date() } };
  if (req.body.tokenAmount !== undefined) patch.$set["financials.tokenAmount"] = req.body.tokenAmount;
  if (req.body.tokenPaid !== undefined) patch.$set["financials.tokenPaid"] = req.body.tokenPaid;
  if (req.body.tokenPayment !== undefined) patch.$set["financials.tokenPayment"] = req.body.tokenPayment;
  const data = await import("./service.js").then((m) => m.service.update(req.params.dealId, patch, req.actor, req));
  if (req.body.tokenPaid) {
    const { SalesDeal } = await import("./model.js");
    const { Property } = await import("../properties/model.js");
    const paymentModule = await import("../payments/service.js");
    const deal = await SalesDeal.findById(req.params.dealId);
    await Property.findByIdAndUpdate(deal.propertyId, { status: "reserved" });
    const confirmed = await paymentModule.confirmDealPaymentsFromAdmin({
      dealId: req.params.dealId,
      type: "token",
      actor: req.actor,
      req,
      notes: req.body.tokenPayment?.notes
    });
    if (!confirmed.length) {
      const recorded = req.body.tokenPayment || {};
      await paymentModule.service.recordAdminOffline({
        dealId: req.params.dealId,
        amount: req.body.tokenAmount ?? recorded.amount,
        method: recorded.method,
        reference: recorded.reference,
        proofUrl: recorded.proofUrl,
        proofDocumentId: recorded.proofDocumentId,
        notes: recorded.notes
      }, req.actor, req);
    }
  }
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/payment-plan", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const patch = { $set: { lastActivityAt: new Date() } };
  if (req.body.paymentType !== undefined) patch.$set["financials.paymentType"] = req.body.paymentType;
  if (req.body.totalPaid !== undefined) patch.$set["financials.totalPaid"] = req.body.totalPaid;
  if (req.body.fullPayment !== undefined) patch.$set["financials.fullPayment"] = req.body.fullPayment;
  if (req.body.stagePayment !== undefined) patch.$set["financials.stagePayment"] = req.body.stagePayment;
  if (req.body.interiorDesign !== undefined) patch.$set["financials.interiorDesign"] = req.body.interiorDesign;
  const data = await import("./service.js").then((m) => m.service.update(req.params.dealId, patch, req.actor, req));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/documentation", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.update(req.params.dealId, { $set: { documentation: req.body || {}, lastActivityAt: new Date() } }, req.actor, req));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/close", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.dealId, "closed", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/lost", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.dealId, "lost", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
export default router;