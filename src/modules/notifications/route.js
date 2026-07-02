import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, markReadValidator, updateValidator } from "./validator.js";
const router = Router();
router.get("/me/notifications", authenticate("customer"), validate(listValidator), controller.mine);
router.patch(
  "/me/notifications/read",
  authenticate("customer"),
  validate(markReadValidator),
  controller.action(async (req, res) => {
    const data = await import("./service.js").then((m) => m.service.markMineRead(req.actor, req.body.ids || []));
    res.json({ data, meta: { requestId: res.locals.requestId } });
  })
);
router.patch(
  "/me/notifications/:id/read",
  authenticate("customer"),
  validate(markReadValidator),
  controller.action(async (req, res) => {
    const data = await import("./service.js").then((m) => m.service.markOneRead(req.params.id, req.actor));
    res.json({ data, meta: { requestId: res.locals.requestId } });
  })
);
router.get("/admin/notifications", authenticate("admin"), requirePermission("support.read"), validate(listValidator), controller.list);
router.patch("/admin/notifications/:id", authenticate("admin"), requirePermission("support.read"), validate(updateValidator), controller.update);
export default router;