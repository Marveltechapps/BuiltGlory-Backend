import mongoose from "mongoose";

export const collectionName = "appFeedback";

export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  message: { type: String, required: true },
  source: { type: String, default: "customer_app" },
  sourceScreen: { type: String, default: "help" },
  status: { type: String, enum: ["new", "reviewed", "archived"], default: "new", index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
};

export const configureSchema = (schema) => {
  schema.index({ createdAt: -1 });
  schema.index({ status: 1, createdAt: -1 });
};
