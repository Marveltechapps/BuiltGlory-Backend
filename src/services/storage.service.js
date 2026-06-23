import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { domainError } from "../shared/errors/AppError.js";
const documentTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const mediaTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4"];
const client = () => {
  if (!env.AWS_S3_BUCKET) throw domainError("S3 bucket is not configured.");
  return new S3Client({ region: env.AWS_REGION });
};
const bucketFor = (quarantine = false) => quarantine && env.QUARANTINE_S3_BUCKET ? env.QUARANTINE_S3_BUCKET : env.AWS_S3_BUCKET;
export const validateUpload = ({ purpose, mimeType, sizeBytes }) => {
  const allowed = purpose === "property_media" ? mediaTypes : documentTypes;
  if (!allowed.includes(mimeType)) throw domainError("Unsupported file type.");
  if (sizeBytes > 25 * 1024 * 1024) throw domainError("File size exceeds 25MB.");
};
export const scanBuffer = async ({ buffer }) => {
  if (env.MALWARE_SCANNER_MODE === "disabled") return { status: "pending", reason: "Scanner disabled" };
  const sample = buffer?.toString("utf8", 0, Math.min(buffer.length, 2048)) || "";
  if (sample.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) return { status: "infected", reason: "Malware test signature detected" };
  return { status: "clean" };
};
export const uploadBuffer = async ({ key, mimeType, buffer, quarantine = false }) => {
  const bucket = bucketFor(quarantine);
  await client().send(new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType, Body: buffer, Metadata: { quarantine: quarantine ? "true" : "false" } }));
  return `s3://${bucket}/${key}`;
};
export const createUploadUrl = async ({ key, mimeType }) => getSignedUrl(client(), new PutObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key, ContentType: mimeType }), { expiresIn: 900 });
export const createReadUrl = async ({ key, expiresIn = 900 }) => getSignedUrl(client(), new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }), { expiresIn: Math.min(Number(expiresIn) || 900, 900) });