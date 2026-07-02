import { User } from "../modules/users/model.js";
import { sendFcmToTokens } from "./firebase.service.js";

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

export const sendPushViaFirebase = async ({ notification, message, payload }) => {
  const tokens = await resolvePushTokens(notification);
  const title = payload?.title || payload?.subject || notification.event?.replace(/[_-]/g, " ") || "BuiltGlory";
  const body = payload?.body || payload?.message || message || "You have a new notification.";
  const data = {
    event: notification.event || "",
    notificationId: String(notification._id || ""),
    deepLink: payload?.deepLink || payload?.route || "",
    referenceId: payload?.referenceId || notification.referenceId || ""
  };
  const response = await sendFcmToTokens({ tokens, title, body, data });
  if (response.invalidTokens?.length) await removeInvalidPushTokens(notification.userId, response.invalidTokens);
  return response;
};
