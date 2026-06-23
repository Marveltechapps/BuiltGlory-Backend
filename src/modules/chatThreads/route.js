import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, updateValidator } from "./validator.js";
const router = Router();
router.get("/admin/negotiations/chats", authenticate("admin"), requirePermission("sales.read"), validate(listValidator), controller.list);
router.get("/admin/negotiations/chats/:threadId", authenticate("admin"), requirePermission("sales.read"), controller.get);
router.post("/admin/negotiations/chats/:threadId/messages", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.addMessage(req.params.threadId, req.body, req.actor, req));
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/negotiations/chats/:threadId/offers/:messageId", authenticate("admin"), requirePermission("sales.write"), validate(updateValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.respondToOffer(req.params.threadId, req.params.messageId, req.body, req.actor, req));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
export default router;