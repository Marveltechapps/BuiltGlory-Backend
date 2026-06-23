import { Router } from "express";
import { Admin } from "./model.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { enqueueNotification } from "../../services/notification.service.js";
import { badRequest } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";
const router = Router();
router.get("/admin/sales-team", authenticate("admin"), requirePermission("users.read"), async (req, res, next) => { try { const data = await Admin.find({ role: { $in: ["sales_manager", "sales_executive", "relationship_manager"] }, isActive: true }); res.json({ data, meta: { requestId: res.locals.requestId } }); } catch (e) { next(e); } });
router.get("/admin/designers", authenticate("admin"), requirePermission("support.read"), async (req, res, next) => { try { const data = await Admin.find({ role: "designer", isActive: true }); res.json({ data, meta: { requestId: res.locals.requestId } }); } catch (e) { next(e); } });
router.get("/admin/message-templates", authenticate("admin"), requirePermission("support.read"), (req, res) => res.json({ data: [
  { id: "visit_reminder", event: "visit_scheduled", channels: ["sms", "whatsapp", "email"], variables: ["customerName", "propertyTitle", "visitDate"] },
  { id: "payment_status", event: "token_payment_status_changed", channels: ["sms", "email", "push"], variables: ["customerName", "referenceId", "status"] },
  { id: "support_response", event: "support_response_added", channels: ["email", "push"], variables: ["customerName", "ticketReferenceId"] }
], meta: { requestId: res.locals.requestId } }));
router.post("/admin/bulk-messages", authenticate("admin"), requirePermission("support.write"), async (req, res, next) => {
  try {
    const { recipients = [], channel, templateId, event = "bulk_message", payload = {}, marketing = false } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) throw badRequest("At least one recipient is required.");
    if (!channel || !templateId) throw badRequest("channel and templateId are required.");
    const notifications = await Promise.all(recipients.map((recipient) => enqueueNotification({ adminId: req.actor.id, event, channel, recipient: String(recipient), templateId, payload, marketing })));
    await writeAuditLog({ actor: req.actor, action: "bulk_message.queued", resourceType: "notification", resourceId: notifications[0]?._id, before: null, after: { channel, templateId, event, queuedCount: notifications.length, marketing }, req });
    res.status(201).json({ data: { status: "queued", queuedCount: notifications.length, notificationIds: notifications.map((item) => item._id) }, meta: { requestId: res.locals.requestId } });
  } catch (error) { next(error); }
});
export default router;