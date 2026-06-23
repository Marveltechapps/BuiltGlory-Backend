import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, createValidator, updateValidator, statusValidator } from "./validator.js";
const router = Router();
router.post("/visits", authenticate("customer"), validate(createValidator), controller.create);
router.patch("/visits/:visitId/reschedule", authenticate("customer"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.visitId, "rescheduled", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/visits/:visitId/cancel", authenticate("customer"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.visitId, "cancelled", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/visits", authenticate("admin"), requirePermission("enquiries.read"), validate(listValidator), controller.list);
router.get("/admin/visits/:visitId", authenticate("admin"), requirePermission("enquiries.read"), controller.get);
router.patch("/admin/visits/:visitId/status", authenticate("admin"), requirePermission("enquiries.write"), validate(statusValidator), controller.transition("status"));
router.post("/admin/visits/:visitId/feedback", authenticate("admin"), requirePermission("enquiries.write"), validate(updateValidator), controller.update);
router.post("/admin/visits/:visitId/call-logs", authenticate("admin"), requirePermission("enquiries.write"), validate(updateValidator), controller.update);
export default router;