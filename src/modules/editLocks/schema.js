import mongoose from "mongoose";

export const collectionName = "editLocks";

export const schemaDefinition = {
  entityType: {
    type: String,
    enum: ["buy_enquiry", "sell_request", "acquisition", "sales_deal", "visit", "callback", "interior_lead", "support_ticket", "user", "property"],
    required: true,
    index: true
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  adminName: String,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  releasedAt: Date
};

export const configureSchema = (schema) => {
  schema.index({ entityType: 1, entityId: 1 }, { unique: true, partialFilterExpression: { releasedAt: { $exists: false } } });
};
