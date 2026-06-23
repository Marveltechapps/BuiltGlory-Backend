import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, createValidator, updateValidator, statusValidator } from "./validator.js";
const router = Router();
router.post("/sell-requests", authenticate("customer"), validate(createValidator), controller.create);
router.post("/sell-requests/drafts", authenticate("customer"), validate(createValidator), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.create({ ...req.body, status: "draft", isDraft: true }, req.actor));
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/me/sell-requests", authenticate("customer"), validate(listValidator), controller.mine);
router.patch("/me/sell-requests/:sellRequestId", authenticate("customer"), validate(updateValidator), controller.update);
router.post("/me/sell-requests/:sellRequestId/submit", authenticate("customer"), controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.transition(req.params.sellRequestId, "new", req.actor, req, req.body || {}));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/sell-requests", authenticate("admin"), requirePermission("acquisitions.read"), validate(listValidator), controller.list);
router.get("/admin/sell-requests/:sellRequestId", authenticate("admin"), requirePermission("acquisitions.read"), controller.get);
router.patch("/admin/sell-requests/:sellRequestId/review", authenticate("admin"), requirePermission("acquisitions.write"), validate(statusValidator), controller.transition("decision"));
router.post("/admin/sell-requests/:sellRequestId/create-acquisition", authenticate("admin"), requirePermission("acquisitions.write"), controller.action(async (req, res) => {
  const { service: acquisitionService } = await import("../acquisitions/service.js");
  const data = await acquisitionService.create({ ...req.body, sellRequestId: req.params.sellRequestId }, req.actor);
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
export default router;