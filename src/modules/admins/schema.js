import mongoose from "mongoose";
import { ADMIN_ROLES } from "../../constants/enums.js";
export const collectionName = "admins";
export const schemaDefinition = {
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ADMIN_ROLES, required: true },
  permissions: [{ type: String, required: true }],
  phone: String, assignedArea: [String], specialization: [String], activeWorkload: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true }, isActive: { type: Boolean, default: true }, lastLoginAt: Date
};
export const configureSchema = (schema) => { schema.index({ role: 1, isActive: 1, isAvailable: 1 }); };