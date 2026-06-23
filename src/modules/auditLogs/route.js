import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator } from "./validator.js";
const router = Router();
router.get("/admin/audit-logs", authenticate("admin"), requirePermission("audit.read"), validate(listValidator), controller.list);
export default router;