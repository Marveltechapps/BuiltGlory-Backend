import { Router } from "express";
import { authenticate, requireAnyPermission, requirePermission } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { controller } from "./controller.js";
import { analyticsValidator, summaryValidator, exportValidator, exportListValidator, exportIdValidator, exportDownloadValidator, scheduleValidator, scheduleListValidator } from "./validator.js";

const router = Router();

router.get("/public/admin-login-stats", controller.loginStats);
router.get(
  "/admin/overview",
  authenticate("admin"),
  requireAnyPermission(["sales.read", "acquisitions.read", "support.read", "users.read", "visits.read", "audit.read"]),
  controller.overview
);
router.get("/admin/reports/summary", authenticate("admin"), requirePermission("sales.read"), validate(summaryValidator), controller.summary);
router.get("/admin/reports/sales/analytics", authenticate("admin"), requirePermission("sales.read"), validate(analyticsValidator), controller.salesAnalytics);
router.get("/admin/reports/acquisition/analytics", authenticate("admin"), requirePermission("acquisitions.read"), validate(analyticsValidator), controller.acquisitionAnalytics);
router.get("/admin/reports/revenue/analytics", authenticate("admin"), requirePermission("sales.read"), validate(analyticsValidator), controller.revenueAnalytics);
router.get("/admin/reports/schedules", authenticate("admin"), requirePermission("audit.read"), validate(scheduleListValidator), controller.listSchedules);
router.post("/admin/reports/schedules", authenticate("admin"), requirePermission("audit.read"), validate(scheduleValidator), controller.createSchedule);
router.get("/admin/reports/exports", authenticate("admin"), requirePermission("audit.read"), validate(exportListValidator), controller.listExports);
router.get("/admin/reports/exports/:id", authenticate("admin"), requirePermission("audit.read"), validate(exportIdValidator), controller.getExport);
router.get("/admin/reports/exports/:id/download-url", authenticate("admin"), requirePermission("audit.read"), validate(exportIdValidator), controller.getExportDownloadUrl);
router.get("/admin/reports/exports/:id/download", validate(exportDownloadValidator), controller.downloadExport);
router.post("/admin/reports/export", authenticate("admin"), requirePermission("audit.read"), validate(exportValidator), controller.exportRequest);

export default router;
