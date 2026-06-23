import crypto from "node:crypto";
import { env } from "../config/env.js";
import { domainError } from "../shared/errors/AppError.js";
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw domainError("Payment webhook secret is not configured.");
  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature || "");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};
export const createGatewayOrder = async ({ amount, currency = "INR", receipt }) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw domainError("Payment gateway credentials are not configured.");
  const auth = Buffer.from(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: "Basic " + auth, "content-type": "application/json" }, body: JSON.stringify({ amount, currency, receipt }) });
  if (!response.ok) throw domainError("Payment order creation failed.");
  return response.json();
};