import mongoose from "mongoose";
export const softDeletePlugin = (schema) => {
  schema.add({ isDeleted: { type: Boolean, default: false, index: true }, deletedAt: { type: Date, default: null }, deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null } });
  schema.query.notDeleted = function notDeleted() { return this.where({ isDeleted: { $ne: true } }); };
};