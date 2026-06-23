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

export const providerAdapters = {
  sms: postJsonProvider,
  whatsapp: postJsonProvider,
  email: postJsonProvider,
  push: postJsonProvider,
  in_app: async ({ message, payload }) => ({ ok: true, status: 200, body: JSON.stringify({ deliveredInApp: true, message, payload }) })
};

export const sendViaProvider = ({ channel, recipient, message, payload }) => {
  const adapter = providerAdapters[channel];
  if (!adapter) return { ok: false, status: 400, body: `Unsupported channel: ${channel}` };
  return adapter({ channel, recipient, message, payload });
};
