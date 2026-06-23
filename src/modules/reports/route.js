import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { controller } from "./controller.js";
import { summaryValidator, exportValidator } from "./validator.js";

const router = Router();

router.get("/admin/overview", authenticate("admin"), requirePermission("sales.read"), controller.overview);
router.get("/admin/reports/summary", authenticate("admin"), requirePermission("sales.read"), validate(summaryValidator), controller.summary);
router.post("/admin/reports/export", authenticate("admin"), requirePermission("audit.read"), validate(exportValidator), controller.exportRequest);

export default router;
