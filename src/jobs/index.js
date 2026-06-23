import { Callback } from "../modules/callbacks/model.js";
import { SupportTicket } from "../modules/supportTickets/model.js";
import { Visit } from "../modules/visits/model.js";
import { SalesDeal } from "../modules/salesDeals/model.js";
import { Acquisition } from "../modules/acquisitions/model.js";
import { Document } from "../modules/documents/model.js";
import { Notification } from "../modules/notifications/model.js";
import { processNotificationQueue, enqueueNotification } from "../services/notification.service.js";
import { withJobLock } from "../services/jobLock.service.js";

const enqueueOnce = async ({ key, ...notification }) => {
  const existing = await Notification.findOne({ event: notification.event, "payload.idempotencyKey": key, status: { $ne: "cancelled" } });
  if (existing) return existing;
  return enqueueNotification({ ...notification, payload: { ...(notification.payload || {}), idempotencyKey: key } });
};

export const markOverdueCallbacks = () => withJobLock("callbacks-overdue", () =>
  Callback.updateMany({ status: { $in: ["pending", "rescheduled", "called"] }, slaDeadline: { $lt: new Date() }, isDeleted: { $ne: true } }, { status: "overdue" }));

export const markOverdueSupportTickets = () => withJobLock("support-overdue", () =>
  SupportTicket.updateMany({ status: { $in: ["open", "in_progress"] }, slaDeadline: { $lt: new Date() }, isDeleted: { $ne: true } }, { priority: "urgent" }));

export const enqueueVisitReminders = async () => {
  const from = new Date();
  const to = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const visits = await Visit.find({ status: { $in: ["scheduled", "confirmed"] }, visitDate: { $gte: from, $lte: to }, isDeleted: { $ne: true } });
  return withJobLock("visit-reminders", () => Promise.all(visits.map((visit) => enqueueOnce({ key: `visit_reminder:${visit._id}:${visit.visitDate.toISOString().slice(0, 10)}`, userId: visit.buyerId, event: "visit_reminder", channel: "in_app", recipient: String(visit.buyerId), templateId: "visit_reminder", payload: { visitId: visit._id, visitDate: visit.visitDate } }))));
};

export const enqueueVisitFollowUps = async () => {
  const visits = await Visit.find({ status: "completed", "feedback.nextAction": "follow_up", isDeleted: { $ne: true } });
  return withJobLock("visit-followups", () => Promise.all(visits.map((visit) => enqueueOnce({ key: `visit_follow_up:${visit._id}`, userId: visit.buyerId, event: "visit_follow_up", channel: "in_app", recipient: String(visit.buyerId), templateId: "visit_follow_up", payload: { visitId: visit._id } }))));
};

export const enqueueDealFollowUps = async () => {
  const deals = await SalesDeal.find({ stage: { $in: ["active_leads", "site_visits", "negotiation", "re_engagement"] }, isDeleted: { $ne: true } }).limit(100);
  return withJobLock("deal-followups", () => Promise.all(deals.map((deal) => enqueueOnce({ key: `deal_follow_up:${deal._id}:${deal.stage}`, userId: deal.buyerId, event: "deal_follow_up", channel: "in_app", recipient: String(deal.buyerId), templateId: "deal_follow_up", payload: { dealId: deal._id, stage: deal.stage } }))));
};

export const retryDocumentScans = () => withJobLock("document-scan-retry", () =>
  Document.updateMany({ scanStatus: { $in: ["pending", "failed"] }, isDeleted: { $ne: true } }, { scanStatus: "pending" }));

export const calculateStageAging = async () => {
  return withJobLock("stage-aging", async () => {
    const now = Date.now();
    const acquisitions = await Acquisition.find({ stage: { $nin: ["acquired", "rejected"] }, isDeleted: { $ne: true } });
    const deals = await SalesDeal.find({ stage: { $nin: ["closed", "lost"] }, isDeleted: { $ne: true } });
    await Promise.all(acquisitions.map((item) => Acquisition.findByIdAndUpdate(item._id, { daysInStage: Math.floor((now - new Date(item.lastActivityAt || item.updatedAt || item.createdAt).getTime()) / 86400000) })));
    await Promise.all(deals.map((item) => SalesDeal.findByIdAndUpdate(item._id, { daysInStage: Math.floor((now - new Date(item.lastActivityAt || item.updatedAt || item.createdAt).getTime()) / 86400000) })));
  });
};

export const runAllJobs = async () => {
  await markOverdueCallbacks();
  await markOverdueSupportTickets();
  await enqueueVisitReminders();
  await enqueueVisitFollowUps();
  await enqueueDealFollowUps();
  await withJobLock("notification-retry", () => processNotificationQueue());
  await retryDocumentScans();
  await calculateStageAging();
};
