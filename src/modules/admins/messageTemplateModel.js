import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: ["whatsapp", "email", "sms", "push", "in_app"], required: true, index: true },
    category: { type: String, default: "General", trim: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
  },
  {
    timestamps: true,
    collection: "messageTemplates",
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.index({ channel: 1, category: 1, isActive: 1 });

export const MessageTemplate = mongoose.models.MessageTemplate || mongoose.model("MessageTemplate", schema);
