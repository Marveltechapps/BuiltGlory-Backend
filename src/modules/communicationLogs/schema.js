import mongoose from "mongoose";

export const collectionName = "communicationLogs";

export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  entityType: {
    type: String,
    enum: ["buy_enquiry", "sell_request", "acquisition", "sales_deal", "visit", "callback", "interior_lead", "support_ticket", "user", "property"],
    required: true,
    index: true
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  channel: { type: String, enum: ["call", "note", "message", "push", "email", "whatsapp", "proof_upload"], required: true },
  direction: { type: String, enum: ["inbound", "outbound", "internal"], default: "internal" },
  summary: { type: String, required: true },
  body: String,
  outcome: String,
  durationMinutes: Number,
  followUpAt: Date,
  attachments: [
    {
      fileName: String,
      url: String,
      mimeType: String,
      sizeBytes: Number,
      storageKey: String
    }
  ],
  actorType: { type: String, enum: ["admin", "customer", "system"], default: "admin" },
  actorId: { type: mongoose.Schema.Types.ObjectId },
  occurredAt: { type: Date, default: Date.now }
};

export const configureSchema = (schema) => {
  schema.index({ entityType: 1, entityId: 1, occurredAt: -1 });
  schema.index({ channel: 1, occurredAt: -1 });
};
