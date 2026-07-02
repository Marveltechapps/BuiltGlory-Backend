import mongoose from "mongoose";
import { schemaDefinition, configureSchema, collectionName } from "./schema.js";
import { softDeletePlugin } from "../../shared/plugins/softDelete.js";

const schema = new mongoose.Schema(schemaDefinition, {
  timestamps: true,
  collection: collectionName,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.plugin(softDeletePlugin);
configureSchema?.(schema);
schema.pre("save", function() { this.updatedAt = new Date(); });

export const CommunicationLog = mongoose.models.CommunicationLog || mongoose.model("CommunicationLog", schema);
