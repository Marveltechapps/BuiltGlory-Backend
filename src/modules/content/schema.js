import mongoose from "mongoose";

export const collectionName = "contentItems";

export const CONTENT_SECTIONS = ["home", "onboarding", "faq", "legal", "about", "news", "general", "banner"];
export const CONTENT_STATUSES = ["draft", "published", "archived"];

export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  section: { type: String, enum: CONTENT_SECTIONS, required: true, index: true },
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, trim: true },
  body: { type: String, default: "" },
  category: { type: String, trim: true, index: true },
  status: { type: String, enum: CONTENT_STATUSES, default: "published", index: true },
  imageUrl: String,
  cta: {
    label: String,
    target: String
  },
  tags: [String],
  order: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  publishedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
};

export const configureSchema = (schema) => {
  schema.index({ section: 1, status: 1, order: 1 });
  schema.index({ title: "text", body: "text", excerpt: "text", category: "text", tags: "text" });
  schema.pre("validate", function setPublishedAt(next) {
    if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
    next();
  });
};
