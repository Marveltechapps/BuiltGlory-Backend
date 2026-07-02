import mongoose from "mongoose";
import { schemaDefinition, configureSchema, collectionName } from "./schema.js";

const schema = new mongoose.Schema(schemaDefinition, {
  timestamps: true,
  collection: collectionName,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

configureSchema?.(schema);

export const EditLock = mongoose.models.EditLock || mongoose.model("EditLock", schema);
