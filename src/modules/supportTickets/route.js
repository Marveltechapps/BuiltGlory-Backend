import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, createValidator, updateValidator } from "./validator.js";
const router = Router();
router.post("/support/tickets", authenticate("customer"), validate(createValidator), controller.create);
router.get("/me/support/tickets", authenticate("customer"), validate(listValidator), controller.mine);
router.get("/admin/support/tickets", authenticate("admin"), requirePermission("support.read"), validate(listValidator), controller.list);
router.get("/admin/support/tickets/:ticketId", authenticate("admin"), requirePermission("support.read"), controller.get);
router.post("/admin/support/tickets/:ticketId/responses", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.addResponse(req.params.ticketId, req.body, req.actor, req));
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/support/tickets/:ticketId", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.update);
export default router;