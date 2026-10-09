import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { createValidator, listValidator, verifyValidator } from "./validator.js";
const router = Router();
router.post("/payments/token", authenticate("customer"), validate(createValidator), controller.create);
router.post("/payments/:paymentId/cancel", authenticate("customer"), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.cancel(req.params.paymentId, req.actor, req));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.post("/payments/webhook", controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.handleWebhook({ rawBody: req.body, signature: req.headers["x-razorpay-signature"], req }));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/me/payments", authenticate("customer"), validate(listValidator), controller.mine);
router.get("/admin/payments", authenticate("admin"), requirePermission("sales.read"), validate(listValidator), controller.list);
router.patch("/admin/payments/:paymentId/verify", authenticate("admin"), requirePermission("sales.write"), validate(verifyValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.verify(req.params.paymentId, req.body, req.actor, req));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
export default router;
