import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { domainError } from "../shared/errors/AppError.js";
const documentTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const mediaTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4"];
const clean = (value) => String(value || "").trim();
const bucketName = (value) => {
  const bucket = clean(value);
  const arnMatch = bucket.match(/^arn:aws:s3:::(.+)$/);
  return arnMatch ? arnMatch[1] : bucket;
};
const credentials = () => {
  const accessKeyId = clean(env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = clean(env.AWS_SECRET_ACCESS_KEY);
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
};
const client = () => {
  if (!bucketName(env.AWS_S3_BUCKET)) throw domainError("S3 bucket is not configured.");
  return new S3Client({ region: clean(env.AWS_REGION) || "ap-south-1", credentials: credentials() });
};
const bucketFor = (quarantine = false) => bucketName(quarantine && env.QUARANTINE_S3_BUCKET ? env.QUARANTINE_S3_BUCKET : env.AWS_S3_BUCKET);
export const s3ObjectUrl = ({ bucket = bucketFor(false), key }) => `https://${bucket}.s3.${clean(env.AWS_REGION) || "ap-south-1"}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
export const storageKeyFromUrl = (url) => {
  const value = clean(url);
  if (!value) return "";
  const bucket = bucketFor(false);
  if (value.startsWith(`s3://${bucket}/`)) return value.slice(`s3://${bucket}/`.length);
  try {
    const parsed = new URL(value);
    const hostPrefix = `${bucket}.s3.`;
    if (parsed.hostname.startsWith(hostPrefix)) return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
  return "";
};
export const validateUpload = ({ purpose, mimeType, sizeBytes }) => {
  const allowed = purpose === "property_media" ? mediaTypes : documentTypes;
  if (!allowed.includes(mimeType)) throw domainError("Unsupported file type.");
  if (sizeBytes > 25 * 1024 * 1024) throw domainError("File size exceeds 25MB.");
};
export const scanBuffer = async ({ buffer }) => {
  if (env.MALWARE_SCANNER_MODE === "disabled") return { status: "clean", reason: "Scanner disabled" };
  const sample = buffer?.toString("utf8", 0, Math.min(buffer.length, 2048)) || "";
  if (sample.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) return { status: "infected", reason: "Malware test signature detected" };
  return { status: "clean" };
};
export const uploadBuffer = async ({ key, mimeType, buffer, quarantine = false }) => {
  const bucket = bucketFor(quarantine);
  await client().send(new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType, Body: buffer, Metadata: { quarantine: quarantine ? "true" : "false" } }));
  return s3ObjectUrl({ bucket, key });
};
export const deleteObject = async ({ key }) => {
  if (!key) return;
  await client().send(new DeleteObjectCommand({ Bucket: bucketFor(false), Key: key }));
};
export const createUploadUrl = async ({ key, mimeType }) => getSignedUrl(client(), new PutObjectCommand({ Bucket: bucketFor(false), Key: key, ContentType: mimeType }), { expiresIn: 900 });
export const createReadUrl = async ({ key, expiresIn = 900 }) => getSignedUrl(client(), new GetObjectCommand({ Bucket: bucketFor(false), Key: key }), { expiresIn: Math.min(Number(expiresIn) || 900, 900) });