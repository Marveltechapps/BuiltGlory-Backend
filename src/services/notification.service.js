import { Notification } from "../modules/notifications/model.js";
import { User } from "../modules/users/model.js";
import { makeReferenceId } from "../shared/id.js";
import { renderTemplate } from "./notificationTemplates.service.js";
import { sendViaProvider } from "./notificationProviders.service.js";
import { logger } from "../config/logger.js";

const preferenceAllows = (user, channel, marketing) => {
  if (!user) return true;
  const pref = user.notificationPreferences?.[channel];
  if (!pref) return true;
  return marketing ? pref.marketing !== false : pref.transactional !== false;
};

const recentNotificationKeys = new Map();
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

const findDuplicateNotification = async (dedupeKey, channel) => {
  if (!dedupeKey) return null;
  const last = recentNotificationKeys.get(`${dedupeKey}:${channel || "any"}`);
  if (last && Date.now() - last < DEDUPE_WINDOW_MS) {
    const cached = await Notification.findOne({
      "payload.dedupeKey": dedupeKey,
      ...(channel ? { channel } : {}),
      createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      status: { $nin: ["cancelled"] }
    }).sort({ createdAt: -1 });
    if (cached) return cached;
  }
  const existing = await Notification.findOne({
    "payload.dedupeKey": dedupeKey,
    ...(channel ? { channel } : {}),
    createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    status: { $nin: ["cancelled"] }
  }).sort({ createdAt: -1 });
  if (existing) {
    recentNotificationKeys.set(`${dedupeKey}:${channel || "any"}`, Date.now());
    return existing;
  }
  recentNotificationKeys.set(`${dedupeKey}:${channel || "any"}`, Date.now());
  return null;
};

export const enqueueNotification = async ({
  userId,
  adminId,
  event,
  channel,
  recipient,
  templateId,
  payload,
  marketing = false,
  dedupeKey,
  title,
  message,
  notificationType,
  listingId,
  enquiryId,
  propertyId,
  dealId,
  screen,
  entityId,
  entityType,
  image
}) => {
  if (dedupeKey) {
    const duplicate = await findDuplicateNotification(dedupeKey, channel);
    if (duplicate) {
      logger.info({ event: "notification_deduplicated", dedupeKey, channel, notificationId: String(duplicate._id) });
      return duplicate;
    }
  }

  const user = userId ? await User.findById(userId) : null;
  const createdAtIso = new Date().toISOString();
  const mergedPayload = {
    ...(payload || {}),
    ...(dedupeKey ? { dedupeKey } : {}),
    entityId: entityId || payload?.entityId || "",
    entityType: entityType || payload?.entityType || "",
    image: image || payload?.image || "",
    createdAt: payload?.createdAt || createdAtIso,
    deepLink: payload?.deepLink || "",
    notificationType: notificationType || payload?.notificationType || payload?.type || "",
    title: title || payload?.title,
    body: message || payload?.body || payload?.message
  };
  const baseFields = {
    referenceId: makeReferenceId("notifications"),
    userId,
    adminId,
    event,
    channel,
    recipient,
    templateId,
    payload: mergedPayload,
    title: title || payload?.title,
    message: message || payload?.message || payload?.body,
    notificationType: notificationType || payload?.notificationType || payload?.type,
    listingId: listingId || payload?.listingId,
    enquiryId: enquiryId || payload?.enquiryId,
    propertyId: propertyId || payload?.propertyId,
    dealId: dealId || payload?.dealId,
    screen: screen || payload?.screen,
    entityId: entityId || payload?.entityId || undefined,
    entityType: entityType || payload?.entityType || undefined,
    image: image || payload?.image || undefined,
    marketing,
    preferenceCheckedAt: new Date()
  };

  if (!preferenceAllows(user, channel, marketing)) {
    return Notification.create({ ...baseFields, status: "cancelled", failureReason: "User notification preference opted out" });
  }

  const notification = await Notification.create({ ...baseFields, status: "queued" });
  if (channel === "push") {
    const dispatched = await dispatchNotification(notification);
    if (!dispatched?.status || dispatched.status === "failed") {
      logger.warn({
        event: "push_dispatch_failed",
        notificationId: String(dispatched?._id || notification._id),
        userId: String(userId || ""),
        failureReason: dispatched?.failureReason
      });
    }
    return dispatched;
  }
  return notification;
};

export const enqueueInAppAndPush = async (options) => {
  const { dedupeKey, payload = {}, ...rest } = options;
  const inApp = await enqueueNotification({
    ...rest,
    channel: "in_app",
    payload,
    dedupeKey
  });
  const pushPayload = {
    ...payload,
    inAppNotificationId: String(inApp?._id || "")
  };
  const push = await enqueueNotification({
    ...rest,
    channel: "push",
    payload: pushPayload,
    dedupeKey: dedupeKey ? `${dedupeKey}:push` : undefined
  });
  return { inApp, push };
};

export const dispatchNotification = async (notification) => {
  if (notification.status === "dead_letter" || notification.status === "cancelled") return notification;
  if (notification.attempts >= notification.maxAttempts) {
    return Notification.findByIdAndUpdate(notification._id, { status: "dead_letter", deadLetterAt: new Date(), failureReason: notification.failureReason || "Max attempts reached" }, { new: true });
  }
  await Notification.findByIdAndUpdate(notification._id, { status: "processing" });
  const message = renderTemplate({ templateId: notification.templateId, channel: notification.channel, payload: notification.payload });
  const response = await sendViaProvider({
    channel: notification.channel,
    recipient: notification.recipient,
    message,
    payload: notification.payload,
    notification
  });
  return Notification.findByIdAndUpdate(notification._id, {
    status: response.ok ? "sent" : "failed",
    providerResponse: response.body,
    provider: notification.channel,
    sentAt: response.ok ? new Date() : undefined,
    deliveredAt: response.ok ? new Date() : undefined,
    failedAt: response.ok ? undefined : new Date(),
    failureReason: response.ok ? undefined : response.body,
    nextAttemptAt: response.ok ? undefined : new Date(Date.now() + Math.min(60_000 * 2 ** notification.attempts, 3_600_000)),
    $inc: { attempts: 1 }
  }, { new: true });
};

export const processNotificationQueue = async ({ limit = 50 } = {}) => {
  const due = await Notification.find({ status: { $in: ["queued", "failed"] }, $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: new Date() } }] }).limit(limit);
  const results = [];
  for (const notification of due) results.push(await dispatchNotification(notification));
  return results;
};