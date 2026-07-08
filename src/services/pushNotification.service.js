import { User } from "../modules/users/model.js";
import { sendFcmToTokens } from "./firebase.service.js";
import { logger } from "../config/logger.js";
import { buildCanonicalNotificationFields } from "../constants/notificationCatalog.js";

const objectIdPattern = /^[a-f0-9]{24}$/i;

const looksLikeFcmToken = (value) => typeof value === "string" && value.length >= 20 && !objectIdPattern.test(value);

export const resolvePushTokens = async (notification) => {
  const tokens = new Set();
  if (looksLikeFcmToken(notification.recipient)) tokens.add(notification.recipient);
  const userId = notification.userId || (objectIdPattern.test(notification.recipient || "") ? notification.recipient : null);
  if (userId) {
    const user = await User.findById(userId).lean();
    for (const device of user?.pushDevices || []) {
      if (device?.token) tokens.add(device.token);
    }
  }
  return [...tokens];
};

export const removeInvalidPushTokens = async (userId, invalidTokens = []) => {
  if (!userId || !invalidTokens.length) return;
  const user = await User.findById(userId).lean();
  if (!user?.pushDevices?.length) return;
  const invalid = new Set(invalidTokens);
  const pushDevices = user.pushDevices.filter((device) => !invalid.has(device.token));
  if (pushDevices.length === user.pushDevices.length) return;
  await User.findByIdAndUpdate(userId, { pushDevices });
};

const stringifyData = (data) =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)]));

export const sendPushViaFirebase = async ({ notification, message, payload }) => {
  const tokens = await resolvePushTokens(notification);
  const audience = payload?.audience || "buyer";
  const canonical = buildCanonicalNotificationFields({
    notificationType: notification.notificationType || payload?.notificationType || payload?.type || notification.event || "",
    audience,
    entityId: payload?.entityId || notification.entityId || "",
    entityType: payload?.entityType || notification.entityType || "",
    deepLink: payload?.deepLink || payload?.screenKey || payload?.route || notification.screen || "",
    title: notification.title || payload?.title || payload?.subject || notification.event?.replace(/[_-]/g, " ") || "BuiltGlory",
    body: notification.message || payload?.body || payload?.message || message || "You have a new notification.",
    image: payload?.image || notification.image || "",
    createdAt: notification.createdAt || payload?.createdAt || new Date(),
    screen: notification.screen || payload?.screen || "",
    screenKey: payload?.screenKey || payload?.deepLink || ""
  });

  const title = canonical.title;
  const body = canonical.body;

  const data = stringifyData({
    notificationType: canonical.notificationType,
    type: canonical.notificationType,
    entityId: canonical.entityId,
    entityType: canonical.entityType,
    deepLink: canonical.deepLink,
    title: canonical.title,
    body: canonical.body,
    image: canonical.image,
    createdAt: canonical.createdAt,
    screen: canonical.screen,
    screenKey: canonical.screenKey,
    event: notification.event || "",
    inAppNotificationId: payload?.inAppNotificationId || "",
    notificationId: String(payload?.inAppNotificationId || notification._id || ""),
    referenceId: payload?.referenceId || notification.referenceId || "",
    listingId: notification.listingId || payload?.listingId || payload?.sellRequestId || "",
    sellRequestId: payload?.sellRequestId || notification.listingId || payload?.listingId || "",
    enquiryId: notification.enquiryId || payload?.enquiryId || "",
    dealId: notification.dealId || payload?.dealId || "",
    propertyId: notification.propertyId || payload?.propertyId || "",
    audience: canonical.audience
  });

  const response = await sendFcmToTokens({
    tokens,
    title,
    body,
    data,
    image: canonical.image || undefined
  });
  if (response.invalidTokens?.length) {
    logger.info({ event: "fcm_invalid_tokens_removed", userId: String(notification.userId || ""), count: response.invalidTokens.length });
    await removeInvalidPushTokens(notification.userId, response.invalidTokens);
  }
  if (!response.ok) {
    logger.warn({ event: "fcm_send_failed", userId: String(notification.userId || ""), status: response.status, body: response.body });
  }
  return response;
};
