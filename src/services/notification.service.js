import { Notification } from "../modules/notifications/model.js";
import { User } from "../modules/users/model.js";
import { makeReferenceId } from "../shared/id.js";
import { renderTemplate } from "./notificationTemplates.service.js";
import { sendViaProvider } from "./notificationProviders.service.js";

const preferenceAllows = (user, channel, marketing) => {
  if (!user) return true;
  const pref = user.notificationPreferences?.[channel];
  if (!pref) return true;
  return marketing ? pref.marketing !== false : pref.transactional !== false;
};

export const enqueueNotification = async ({ userId, adminId, event, channel, recipient, templateId, payload, marketing = false }) => {
  const user = userId ? await User.findById(userId) : null;
  if (!preferenceAllows(user, channel, marketing)) {
    return Notification.create({ referenceId: makeReferenceId("notifications"), userId, adminId, event, channel, recipient, templateId, payload, marketing, status: "cancelled", failureReason: "User notification preference opted out", preferenceCheckedAt: new Date() });
  }
  return Notification.create({ referenceId: makeReferenceId("notifications"), userId, adminId, event, channel, recipient, templateId, payload, marketing, status: "queued", preferenceCheckedAt: new Date() });
};

export const dispatchNotification = async (notification) => {
  if (notification.status === "dead_letter" || notification.status === "cancelled") return notification;
  if (notification.attempts >= notification.maxAttempts) {
    return Notification.findByIdAndUpdate(notification._id, { status: "dead_letter", deadLetterAt: new Date(), failureReason: notification.failureReason || "Max attempts reached" }, { new: true });
  }
  await Notification.findByIdAndUpdate(notification._id, { status: "processing" });
  const message = renderTemplate({ templateId: notification.templateId, channel: notification.channel, payload: notification.payload });
  const response = await sendViaProvider({ channel: notification.channel, recipient: notification.recipient, message, payload: notification.payload });
  return Notification.findByIdAndUpdate(notification._id, { status: response.ok ? "sent" : "failed", providerResponse: response.body, provider: notification.channel, sentAt: response.ok ? new Date() : undefined, failedAt: response.ok ? undefined : new Date(), failureReason: response.ok ? undefined : response.body, nextAttemptAt: response.ok ? undefined : new Date(Date.now() + Math.min(60_000 * 2 ** notification.attempts, 3_600_000)), $inc: { attempts: 1 } }, { new: true });
};

export const processNotificationQueue = async ({ limit = 50 } = {}) => {
  const due = await Notification.find({ status: { $in: ["queued", "failed"] }, $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: new Date() } }] }).limit(limit);
  const results = [];
  for (const notification of due) results.push(await dispatchNotification(notification));
  return results;
};