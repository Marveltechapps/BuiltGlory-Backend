import mongoose from "mongoose";
export const collectionName = "auditLogs";
export const schemaDefinition = {
  actorType: { type: String, enum: ["admin", "customer", "system"], required: true }, actorId: mongoose.Schema.Types.ObjectId, action: { type: String, required: true }, resourceType: { type: String, required: true }, resourceId: mongoose.Schema.Types.ObjectId,
  before: mongoose.Schema.Types.Mixed, after: mongoose.Schema.Types.Mixed, ipAddress: String, userAgent: String
};
export const configureSchema = (schema) => {
  schema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
  schema.index({ actorId: 1, createdAt: -1 });
  schema.index({ action: 1, createdAt: -1 });
  const blockMutation = function blockMutation(next) { next(new Error("Audit logs are immutable.")); };
  schema.pre("findOneAndUpdate", blockMutation);
  schema.pre("updateOne", blockMutation);
  schema.pre("updateMany", blockMutation);
  schema.pre("deleteOne", blockMutation);
  schema.pre("deleteMany", blockMutation);
};