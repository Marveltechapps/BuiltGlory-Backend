import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, createValidator, updateValidator } from "./validator.js";
const router = Router();
router.post("/callbacks", authenticate("customer"), validate(createValidator), controller.create);
router.get("/admin/callbacks", authenticate("admin"), requirePermission("support.read"), validate(listValidator), controller.list);
router.get("/admin/callbacks/:callbackId", authenticate("admin"), requirePermission("support.read"), controller.get);
router.post("/admin/callbacks/:callbackId/attempts", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.addAttempt(req.params.callbackId, req.body, req.actor, req));
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/callbacks/:callbackId/resolve", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.callbackId, "resolved", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/callbacks/:callbackId/reschedule", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.callbackId, "rescheduled", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
export default router;