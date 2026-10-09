import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import {
  listValidator,
  createValidator,
  updateValidator,
  responseValidator,
  liveChatStartValidator
} from "./validator.js";
import { publishSupportTicket } from "../../realtime/chatSocket.js";
import { service } from "./service.js";

const router = Router();

router.post("/support/tickets", authenticate("customer"), validate(createValidator), controller.create);

router.get("/me/support/tickets", authenticate("customer"), validate(listValidator), controller.mine);
router.get("/me/support/live-chat", authenticate("customer"), async (req, res, next) => {
  try {
    const data = await service.getActiveLiveChat(req.actor);
    res.json({ data, meta: { requestId: res.locals.requestId } });
  } catch (error) {
    next(error);
  }
});
router.post("/me/support/live-chat", authenticate("customer"), validate(liveChatStartValidator), async (req, res, next) => {
  try {
    const data = await service.startLiveChat(req.body || {}, req.actor);
    publishSupportTicket(data);
    res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
  } catch (error) {
    next(error);
  }
});

router.get("/me/support/tickets/:ticketId", authenticate("customer"), controller.get);
router.post(
  "/me/support/tickets/:ticketId/responses",
  authenticate("customer"),
  validate(responseValidator),
  controller.action(async (req, res) => {
    const data = await service.addResponse(req.params.ticketId, req.body, req.actor, req);
    publishSupportTicket(data);
    res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
  })
);
router.post("/me/support/tickets/:ticketId/read", authenticate("customer"), async (req, res, next) => {
  try {
    const data = await service.markRead(req.params.ticketId, req.actor);
    publishSupportTicket(data);
    res.json({ data, meta: { requestId: res.locals.requestId } });
  } catch (error) {
    next(error);
  }
});
router.post("/me/support/tickets/:ticketId/close", authenticate("customer"), async (req, res, next) => {
  try {
    const data = await service.closeChat(req.params.ticketId, req.actor, req);
    publishSupportTicket(data);
    res.json({ data, meta: { requestId: res.locals.requestId } });
  } catch (error) {
    next(error);
  }
});
router.post("/me/support/tickets/:ticketId/reopen", authenticate("customer"), async (req, res, next) => {
  try {
    const data = await service.reopenChat(req.params.ticketId, req.actor, req);
    publishSupportTicket(data);
    res.json({ data, meta: { requestId: res.locals.requestId } });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/support/tickets", authenticate("admin"), requirePermission("support.read"), validate(listValidator), controller.list);
router.get("/admin/support/tickets/:ticketId", authenticate("admin"), requirePermission("support.read"), controller.get);
router.post(
  "/admin/support/tickets/:ticketId/responses",
  authenticate("admin"),
  requirePermission("support.write"),
  validate(updateValidator),
  controller.action(async (req, res) => {
    const data = await service.addResponse(req.params.ticketId, req.body, req.actor, req);
    publishSupportTicket(data);
    res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
  })
);
router.post(
  "/admin/support/tickets/:ticketId/read",
  authenticate("admin"),
  requirePermission("support.read"),
  async (req, res, next) => {
    try {
      const data = await service.markRead(req.params.ticketId, req.actor);
      publishSupportTicket(data);
      res.json({ data, meta: { requestId: res.locals.requestId } });
    } catch (error) {
      next(error);
    }
  }
);
router.post(
  "/admin/support/tickets/:ticketId/close",
  authenticate("admin"),
  requirePermission("support.write"),
  async (req, res, next) => {
    try {
      const data = await service.closeChat(req.params.ticketId, req.actor, req);
      publishSupportTicket(data);
      res.json({ data, meta: { requestId: res.locals.requestId } });
    } catch (error) {
      next(error);
    }
  }
);
router.post(
  "/admin/support/tickets/:ticketId/reopen",
  authenticate("admin"),
  requirePermission("support.write"),
  async (req, res, next) => {
    try {
      const data = await service.reopenChat(req.params.ticketId, req.actor, req);
      publishSupportTicket(data);
      res.json({ data, meta: { requestId: res.locals.requestId } });
    } catch (error) {
      next(error);
    }
  }
);
router.patch("/admin/support/tickets/:ticketId", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.update);

export default router;
