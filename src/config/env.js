import dotenv from "dotenv";
import Joi from "joi";
dotenv.config();
const schema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "staging", "production").default("development"),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().when("NODE_ENV", { is: "production", then: Joi.required(), otherwise: Joi.string().default("mongodb://127.0.0.1:27017/builtglory") }),
  JWT_ACCESS_SECRET: Joi.string().min(24).when("NODE_ENV", { is: "production", then: Joi.required(), otherwise: Joi.string().default("dev-access-secret-change-before-production") }),
  JWT_REFRESH_SECRET: Joi.string().min(24).when("NODE_ENV", { is: "production", then: Joi.required(), otherwise: Joi.string().default("dev-refresh-secret-change-before-production") }),
  JWT_ISSUER: Joi.string().default("builtglory-api"),
  JWT_AUDIENCE: Joi.string().default("builtglory-clients"),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("30d"),
  ADMIN_INACTIVITY_SECONDS: Joi.number().default(1800),
  OTP_EXPIRES_SECONDS: Joi.number().default(300),
  OTP_RESEND_SECONDS: Joi.number().default(60),
  OTP_MAX_ATTEMPTS: Joi.number().default(5),
  WEBHOOK_TOLERANCE_SECONDS: Joi.number().default(300),
  REDIS_URL: Joi.string().allow("").default(""),
  CORS_ORIGINS: Joi.string().when("NODE_ENV", { is: "production", then: Joi.string().min(1).required(), otherwise: Joi.string().allow("").default("") }),
  AWS_REGION: Joi.string().default("ap-south-1"),
  AWS_S3_BUCKET: Joi.string().allow("").default(""),
  AWS_ACCESS_KEY_ID: Joi.string().allow("").default(""),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow("").default(""),
  RAZORPAY_KEY_ID: Joi.string().allow("").default(""),
  RAZORPAY_KEY_SECRET: Joi.string().allow("").default(""),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().when("NODE_ENV", { is: "production", then: Joi.string().min(16).required(), otherwise: Joi.string().allow("").default("") }),
  MALWARE_SCANNER_MODE: Joi.string().valid("disabled", "clamav", "provider").default("disabled"),
  QUARANTINE_S3_BUCKET: Joi.string().allow("").default(""),
  SMS_PROVIDER_URL: Joi.string().allow("").default(""),
  SMS_PROVIDER_TOKEN: Joi.string().allow("").default(""),
  WHATSAPP_PROVIDER_URL: Joi.string().allow("").default(""),
  WHATSAPP_PROVIDER_TOKEN: Joi.string().allow("").default(""),
  EMAIL_PROVIDER_URL: Joi.string().allow("").default(""),
  EMAIL_PROVIDER_TOKEN: Joi.string().allow("").default(""),
  PUSH_PROVIDER_URL: Joi.string().allow("").default(""),
  PUSH_PROVIDER_TOKEN: Joi.string().allow("").default("")
}).unknown();
const { value, error } = schema.validate(process.env, { abortEarly: false });
if (error) throw new Error("Invalid environment: " + error.details.map((d) => d.message).join(", "));
export const env = value;