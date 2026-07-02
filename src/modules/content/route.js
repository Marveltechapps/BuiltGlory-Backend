import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { createValidator, listValidator, publicListValidator, reorderValidator, updateValidator } from "./validator.js";

const router = Router();

router.get("/content", validate(publicListValidator), controller.listPublic);
router.get("/content/:slug", controller.getPublic);

router.get("/admin/content", authenticate("admin"), requirePermission("support.read"), validate(listValidator), controller.list);
router.post("/admin/content", authenticate("admin"), requirePermission("support.write"), validate(createValidator), controller.create);
router.patch("/admin/content/reorder", authenticate("admin"), requirePermission("support.write"), validate(reorderValidator), controller.reorder);
router.patch("/admin/content/:contentId", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.update);
router.delete("/admin/content/:contentId", authenticate("admin"), requirePermission("support.write"), controller.remove);

export default router;
