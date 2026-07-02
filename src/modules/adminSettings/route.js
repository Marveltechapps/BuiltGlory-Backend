import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { controller } from "./controller.js";
import { updateValidator } from "./validator.js";

const router = Router();

router.get("/admin/settings", authenticate("admin"), requirePermission("admin.access.manage"), controller.get);
router.patch("/admin/settings", authenticate("admin"), requirePermission("admin.access.manage"), validate(updateValidator), controller.update);

export default router;
