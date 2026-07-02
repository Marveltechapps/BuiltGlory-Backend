import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Admin } from "./model.js";
import { User } from "../users/model.js";
import { MessageTemplate } from "./messageTemplateModel.js";
import { BulkMessage } from "./bulkMessageModel.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { enqueueNotification } from "../../services/notification.service.js";
import { renderTemplate } from "../../services/notificationTemplates.service.js";
import { badRequest, notFound, conflict } from "../../shared/errors/AppError.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { ROLE_PERMISSIONS, PERMISSIONS } from "../../constants/permissions.js";
import { makeReferenceId } from "../../shared/id.js";
const router = Router();
const sanitizeAdmin = (admin) => {
  const obj = admin.toObject ? admin.toObject() : admin;
  delete obj.passwordHash;
  return obj;
};
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
const SALES_ROLES = ["sales_manager", "sales_executive", "relationship_manager"];
const issueTemporaryPassword = () => crypto.randomBytes(18).toString("base64url");
const ensureSalesRole = (role = "sales_executive") => SALES_ROLES.includes(role) ? role : "sales_executive";
const DEFAULT_MESSAGE_TEMPLATES = [
  { name: "Visit Confirmation", channel: "whatsapp", category: "Visit", body: "Hi {buyerName}, your visit for {propertyTitle} is confirmed for {date} at {time}." },
  { name: "Token Payment Request", channel: "whatsapp", category: "Payment", body: "Hi {buyerName}, please pay token amount of Rs {amount} for {propertyTitle}. Reference: {referenceId}" },
  { name: "KYC Reminder", channel: "sms", category: "KYC", body: "Hi {buyerName}, please complete your KYC verification on the Builtglory app." },
  { name: "Welcome Email", channel: "email", category: "General", subject: "Welcome to Builtglory!", body: "Dear {buyerName}, welcome to Builtglory." }
];
const templateVariables = (body = "") => Array.from(new Set(String(body).match(/\{\{?([\w.]+)\}?\}/g)?.map((part) => part.replace(/[{}]/g, "")) || []));
const ensureDefaultTemplates = async (actorId) => {
  if (await MessageTemplate.estimatedDocumentCount()) return;
  await MessageTemplate.insertMany(DEFAULT_MESSAGE_TEMPLATES.map((item) => ({ ...item, referenceId: makeReferenceId("messageTemplates"), variables: templateVariables(item.body), createdBy: actorId, updatedBy: actorId })));
};
const isObjectIdLike = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
const cleanRecipient = (value) => String(value || "").trim();
const contactForChannel = (user, channel) => channel === "email" ? user.email : (user.phone || user.mobileNumber || user.phoneNormalized || user.email);
const recipientsForAudience = async ({ audience = "all", channel = "whatsapp", recipients = [] }) => {
  const explicit = recipients.map(cleanRecipient).filter(Boolean);
  if (explicit.length) return explicit;
  const filter = { isDeleted: { $ne: true }, isActive: { $ne: false } };
  if (audience === "buyers") filter.role = { $in: ["buyer", "both"] };
  if (audience === "sellers") filter.role = { $in: ["seller", "both"] };
  if (audience === "nri") filter.userType = "nri";
  if (audience === "kyc") filter.kycStatus = "verified";
  const users = await User.find(filter).limit(5000);
  const primaryChannel = channel === "all" ? "whatsapp" : channel;
  return users.map((user) => cleanRecipient(contactForChannel(user, primaryChannel))).filter(Boolean);
};
router.get("/admin/sales-team", authenticate("admin"), requirePermission("users.read"), async (req, res, next) => { try { const data = await Admin.find({ role: { $in: ["sales_manager", "sales_executive", "relationship_manager"] }, isActive: true }); res.json({ data, meta: { requestId: res.locals.requestId } }); } catch (e) { next(e); } });
router.post("/admin/sales-team", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const { name, email, phone, role = "sales_executive", assignedArea = [], isAvailable = true } = req.body || {};
    if (!name || !email) throw badRequest("name and email are required.");
    const existing = await Admin.findOne({ email: String(email).toLowerCase() });
    if (existing) throw conflict("Admin email already exists.");
    const salesRole = ensureSalesRole(role);
    const admin = await Admin.create({
      name,
      email,
      phone,
      role: salesRole,
      assignedArea,
      isAvailable,
      permissions: ROLE_PERMISSIONS[salesRole] || [],
      passwordHash: await bcrypt.hash(issueTemporaryPassword(), 10),
      isActive: true
    });
    await writeAuditLog({ actor: req.actor, action: "sales_team.created", resourceType: "admin", resourceId: admin._id, before: null, after: sanitizeAdmin(admin), req });
    res.status(201).json({ data: { ...sanitizeAdmin(admin), inviteStatus: "created", temporaryPasswordIssued: true }, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.patch("/admin/sales-team/:id", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const before = await Admin.findById(req.params.id);
    if (!before || !SALES_ROLES.includes(before.role)) throw notFound("Sales team member not found.");
    const allowed = compact((({ name, email, phone, role, assignedArea, isAvailable, isActive }) => ({ name, email, phone, role: role ? ensureSalesRole(role) : undefined, assignedArea, isAvailable, isActive }))(req.body || {}));
    if (allowed.role) allowed.permissions = ROLE_PERMISSIONS[allowed.role] || before.permissions;
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true });
    await writeAuditLog({ actor: req.actor, action: "sales_team.updated", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.delete("/admin/sales-team/:id", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const before = await Admin.findById(req.params.id);
    if (!before || !SALES_ROLES.includes(before.role)) throw notFound("Sales team member not found.");
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { isActive: false, isAvailable: false } }, { new: true });
    await writeAuditLog({ actor: req.actor, action: "sales_team.removed", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.get("/admin/designers", authenticate("admin"), requirePermission("support.read"), async (req, res, next) => { try { const data = await Admin.find({ role: "designer", isActive: true }); res.json({ data, meta: { requestId: res.locals.requestId } }); } catch (e) { next(e); } });
router.get("/admin/admins", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status === "active") filter.isActive = true;
    if (status === "suspended") filter.isActive = false;
    if (search) filter.$or = [{ name: new RegExp(String(search), "i") }, { email: new RegExp(String(search), "i") }];
    const data = await Admin.find(filter).sort({ createdAt: -1 });
    res.json({ data: data.map(sanitizeAdmin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.post("/admin/admins/invite", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const { name, email, role = "admin", phone, assignedArea = [], specialization = [], permissions } = req.body || {};
    if (!name || !email) throw badRequest("name and email are required.");
    const existing = await Admin.findOne({ email: String(email).toLowerCase() });
    if (existing) throw conflict("Admin email already exists.");
    const temporaryPassword = crypto.randomBytes(18).toString("base64url");
    const admin = await Admin.create({
      name,
      email,
      role,
      phone,
      assignedArea,
      specialization,
      permissions: Array.isArray(permissions) && permissions.length ? permissions.filter((p) => PERMISSIONS.includes(p)) : ROLE_PERMISSIONS[role] || [],
      passwordHash: await bcrypt.hash(temporaryPassword, 10),
      isActive: true
    });
    await writeAuditLog({ actor: req.actor, action: "admin.invited", resourceType: "admin", resourceId: admin._id, before: null, after: sanitizeAdmin(admin), req });
    res.status(201).json({ data: { ...sanitizeAdmin(admin), inviteStatus: "created", temporaryPasswordIssued: true }, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.patch("/admin/admins/:id", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const before = await Admin.findById(req.params.id);
    if (!before) throw notFound("Admin not found.");
    const allowed = compact((({ name, email, role, phone, assignedArea, specialization, isAvailable, isActive, status }) => ({ name, email, role, phone, assignedArea, specialization, isAvailable, isActive: isActive ?? (status === "active" ? true : status === "suspended" ? false : undefined) }))(req.body || {}));
    if (allowed.role && !allowed.permissions) allowed.permissions = ROLE_PERMISSIONS[allowed.role] || before.permissions;
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true });
    await writeAuditLog({ actor: req.actor, action: "admin.updated", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.patch("/admin/admins/:id/permissions", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const before = await Admin.findById(req.params.id);
    if (!before) throw notFound("Admin not found.");
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.filter((p) => PERMISSIONS.includes(p)) : null;
    if (!permissions) throw badRequest("permissions must be an array.");
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { permissions } }, { new: true, runValidators: true });
    await writeAuditLog({ actor: req.actor, action: "admin.permissions_updated", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.post("/admin/admins/:id/reset-password", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 8) throw badRequest("Password must be at least 8 characters.");
    const before = await Admin.findById(req.params.id);
    if (!before) throw notFound("Admin not found.");
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { passwordHash: await bcrypt.hash(password, 10) } }, { new: true });
    await writeAuditLog({ actor: req.actor, action: "admin.password_reset", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.post("/admin/admins/:id/suspend", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    if (String(req.actor.id) === String(req.params.id)) throw badRequest("You cannot suspend your own account.");
    const before = await Admin.findById(req.params.id);
    if (!before) throw notFound("Admin not found.");
    const isActive = req.body?.active === true || req.body?.suspended === false;
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { isActive } }, { new: true });
    await writeAuditLog({ actor: req.actor, action: isActive ? "admin.reactivated" : "admin.suspended", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.delete("/admin/admins/:id", authenticate("admin"), requirePermission("admin.access.manage"), async (req, res, next) => {
  try {
    if (String(req.actor.id) === String(req.params.id)) throw badRequest("You cannot remove your own account.");
    const before = await Admin.findById(req.params.id);
    if (!before) throw notFound("Admin not found.");
    if (before.role === "super_admin") {
      const activeSuperAdmins = await Admin.countDocuments({ role: "super_admin", isActive: true });
      if (activeSuperAdmins <= 1) throw badRequest("Cannot remove the last super admin.");
    }
    const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
    await writeAuditLog({ actor: req.actor, action: "admin.removed", resourceType: "admin", resourceId: admin._id, before: sanitizeAdmin(before), after: sanitizeAdmin(admin), req });
    res.json({ data: sanitizeAdmin(admin), meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.get("/admin/message-templates", authenticate("admin"), requirePermission("support.read"), async (req, res, next) => {
  try {
    await ensureDefaultTemplates(req.actor.id);
    const filter = { isActive: true };
    if (req.query.channel) filter.channel = req.query.channel;
    const data = await MessageTemplate.find(filter).sort({ channel: 1, category: 1, createdAt: -1 });
    res.json({ data, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.post("/admin/message-templates", authenticate("admin"), requirePermission("support.write"), async (req, res, next) => {
  try {
    const { name, channel, category = "General", subject, body } = req.body || {};
    if (!name || !channel || !body) throw badRequest("name, channel and body are required.");
    const template = await MessageTemplate.create({ referenceId: makeReferenceId("messageTemplates"), name, channel, category, subject, body, variables: templateVariables(body), createdBy: req.actor.id, updatedBy: req.actor.id });
    await writeAuditLog({ actor: req.actor, action: "message_template.created", resourceType: "messageTemplate", resourceId: template._id, before: null, after: template, req });
    res.status(201).json({ data: template, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.patch("/admin/message-templates/:id", authenticate("admin"), requirePermission("support.write"), async (req, res, next) => {
  try {
    const before = await MessageTemplate.findById(req.params.id);
    if (!before) throw notFound("Message template not found.");
    const allowed = compact((({ name, channel, category, subject, body, isActive }) => ({ name, channel, category, subject, body, isActive, variables: body ? templateVariables(body) : undefined, updatedBy: req.actor.id }))(req.body || {}));
    const template = await MessageTemplate.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true });
    await writeAuditLog({ actor: req.actor, action: "message_template.updated", resourceType: "messageTemplate", resourceId: template._id, before, after: template, req });
    res.json({ data: template, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.delete("/admin/message-templates/:id", authenticate("admin"), requirePermission("support.write"), async (req, res, next) => {
  try {
    const before = await MessageTemplate.findById(req.params.id);
    if (!before) throw notFound("Message template not found.");
    const template = await MessageTemplate.findByIdAndUpdate(req.params.id, { $set: { isActive: false, updatedBy: req.actor.id } }, { new: true });
    await writeAuditLog({ actor: req.actor, action: "message_template.deleted", resourceType: "messageTemplate", resourceId: template._id, before, after: template, req });
    res.json({ data: template, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.get("/admin/bulk-messages", authenticate("admin"), requirePermission("support.read"), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const data = await BulkMessage.find({}).populate("requestedBy", "name email").sort({ createdAt: -1 }).limit(limit);
    res.json({ data, meta: { requestId: res.locals.requestId } });
  } catch (e) { next(e); }
});
router.post("/admin/bulk-messages", authenticate("admin"), requirePermission("support.write"), async (req, res, next) => {
  try {
    const { recipients = [], audience = "all", channel, templateId, event = "bulk_message", payload = {}, marketing = false, scheduledAt } = req.body || {};
    let { title, message } = req.body || {};
    if (templateId && !message) {
      await ensureDefaultTemplates(req.actor.id);
      const templateLookup = [{ referenceId: templateId }, { name: templateId }];
      if (isObjectIdLike(templateId)) templateLookup.push({ _id: templateId });
      const template = await MessageTemplate.findOne({ $or: templateLookup, isActive: true });
      if (template) {
        title = title || template.subject || template.name;
        message = template.body;
      } else {
        message = renderTemplate({ templateId, channel, payload });
        title = title || templateId;
      }
      if (!message) throw badRequest("Message template not found.");
    }
    if (!channel || !message) throw badRequest("channel and message are required.");
    const resolvedRecipients = await recipientsForAudience({ audience, channel, recipients });
    if (!resolvedRecipients.length) throw badRequest("At least one recipient is required.");
    const sendChannels = channel === "all" ? ["whatsapp", "email", "sms"] : [channel];
    const notifications = [];
    for (const recipient of resolvedRecipients) {
      for (const sendChannel of sendChannels) {
        notifications.push(await enqueueNotification({ adminId: req.actor.id, event, channel: sendChannel, recipient, templateId: templateId || "bulk_message", payload: { ...payload, title, message }, marketing }));
      }
    }
    const status = scheduledAt ? "scheduled" : "queued";
    const batch = await BulkMessage.create({ referenceId: makeReferenceId("bulkMessages"), status, channel, audience, title, message, templateId, recipients: resolvedRecipients, queuedCount: notifications.length, notificationIds: notifications.map((item) => item._id), scheduledAt, requestedBy: req.actor.id });
    await writeAuditLog({ actor: req.actor, action: "bulk_message.queued", resourceType: "bulkMessage", resourceId: batch._id, before: null, after: { channel, templateId, event, queuedCount: notifications.length, marketing }, req });
    res.status(201).json({ data: batch, meta: { requestId: res.locals.requestId } });
  } catch (error) { next(error); }
});
export default router;