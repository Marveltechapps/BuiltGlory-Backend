import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, updateValidator, statusValidator } from "./validator.js";
const router = Router();
router.get("/admin/sales/deals", authenticate("admin"), requirePermission("sales.read"), validate(listValidator), controller.list);
router.get("/admin/sales/deals/:dealId", authenticate("admin"), requirePermission("sales.read"), controller.get);
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
  const data = await import("./service.js").then((m) => m.service.update(req.params.dealId, patch, req.actor, req));
  if (req.body.tokenPaid) {
    const { SalesDeal } = await import("./model.js");
    const { Property } = await import("../properties/model.js");
    const deal = await SalesDeal.findById(req.params.dealId);
    await Property.findByIdAndUpdate(deal.propertyId, { status: "reserved" });
  }
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/sales/deals/:dealId/payment-plan", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const patch = { $set: { lastActivityAt: new Date() } };
  if (req.body.paymentType !== undefined) patch.$set["financials.paymentType"] = req.body.paymentType;
  if (req.body.totalPaid !== undefined) patch.$set["financials.totalPaid"] = req.body.totalPaid;
  const data = await import("./service.js").then((m) => m.service.update(req.params.dealId, patch, req.actor, req));
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