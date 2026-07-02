import { isFirebaseConfigured } from "./firebase.service.js";
import { sendPushViaFirebase } from "./pushNotification.service.js";

const providerEnvPrefix = {
  sms: "SMS",
  whatsapp: "WHATSAPP",
  email: "EMAIL",
  push: "PUSH"
};

const postJsonProvider = async ({ channel, recipient, message, payload }) => {
  const prefix = providerEnvPrefix[channel];
  const providerUrl = process.env[`${prefix}_PROVIDER_URL`];
  const token = process.env[`${prefix}_PROVIDER_TOKEN`];
  if (!providerUrl || !token) return { ok: false, status: 503, body: "Provider not configured" };
  const response = await fetch(providerUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ recipient, message, payload })
  });
  return { ok: response.ok, status: response.status, body: await response.text() };
};

const pushProvider = async ({ recipient, message, payload, notification }) => {
  if (isFirebaseConfigured()) {
    return sendPushViaFirebase({
      notification: notification || { recipient, userId: payload?.userId },
      message,
      payload
    });
  }
  return postJsonProvider({ channel: "push", recipient, message, payload });
};

export const providerAdapters = {
  sms: postJsonProvider,
  whatsapp: postJsonProvider,
  email: postJsonProvider,
  push: pushProvider,
  in_app: async ({ message, payload }) => ({ ok: true, status: 200, body: JSON.stringify({ deliveredInApp: true, message, payload }) })
};

export const sendViaProvider = ({ channel, recipient, message, payload, notification }) => {
  const adapter = providerAdapters[channel];
  if (!adapter) return { ok: false, status: 400, body: `Unsupported channel: ${channel}` };
  return adapter({ channel, recipient, message, payload, notification });
};
