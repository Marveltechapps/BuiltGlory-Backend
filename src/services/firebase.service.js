import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { env } from "../config/env.js";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");

let firebaseApp = null;

const readServiceAccountFromFile = () => {
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) return null;
  try {
    const raw = readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const resolveServiceAccount = () => {
  const fromFile = readServiceAccountFromFile();
  if (fromFile) return fromFile;
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) return null;
  return {
    project_id: env.FIREBASE_PROJECT_ID,
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  };
};

export const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;
  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) return null;
  firebaseApp = admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: serviceAccount.project_id || env.FIREBASE_PROJECT_ID
  });
  return firebaseApp;
};

export const isFirebaseConfigured = () => Boolean(getFirebaseApp());

const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered"
]);

export const sendFcmNotification = async ({ token, title, body, data = {} }) => {
  if (!getFirebaseApp()) return { ok: false, status: 503, body: "Firebase not configured" };
  try {
    const messageId = await getMessaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)])),
      android: {
        priority: "high",
        notification: { channelId: "default" }
      }
    });
    return { ok: true, status: 200, body: JSON.stringify({ messageId }) };
  } catch (error) {
    const code = error?.code || error?.errorInfo?.code;
    return {
      ok: false,
      status: invalidTokenCodes.has(code) ? 410 : 502,
      body: error?.message || "FCM send failed",
      invalidToken: invalidTokenCodes.has(code)
    };
  }
};

export const sendFcmToTokens = async ({ tokens, title, body, data = {} }) => {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (!uniqueTokens.length) return { ok: false, status: 404, body: "No push tokens available", invalidTokens: [] };
  const results = await Promise.all(uniqueTokens.map((token) => sendFcmNotification({ token, title, body, data })));
  const invalidTokens = uniqueTokens.filter((token, index) => results[index]?.invalidToken);
  const sent = results.some((result) => result.ok);
  if (sent) {
    return {
      ok: true,
      status: 200,
      body: JSON.stringify({
        sentCount: results.filter((result) => result.ok).length,
        failedCount: results.filter((result) => !result.ok).length
      }),
      invalidTokens
    };
  }
  return {
    ok: false,
    status: results[0]?.status || 502,
    body: results.map((result) => result.body).join("; "),
    invalidTokens
  };
};
