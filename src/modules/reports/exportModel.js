import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["queued", "processing", "completed", "failed", "expired"], default: "queued", index: true },
    format: { type: String, enum: ["csv", "xlsx", "pdf"], default: "xlsx" },
    exportTypes: [{ type: String }],
    storageKey: { type: String, required: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", index: true },
    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,
    failedAt: Date,
    failureReason: String,
    fileName: String,
    mimeType: String,
    sizeBytes: { type: Number, default: 0 },
    rowCount: { type: Number, default: 0 },
    fileContent: Buffer,
    downloadToken: { type: String, index: true },
    downloadTokenExpiresAt: Date,
    expiresAt: { type: Date, required: true, index: true }
  },
  {
    timestamps: true,
    collection: "reportExports",
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.fileContent;
        delete ret.downloadToken;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.fileContent;
        delete ret.downloadToken;
        return ret;
      }
    }
  }
);

schema.index({ requestedAt: -1 });

export const ReportExport = mongoose.models.ReportExport || mongoose.model("ReportExport", schema);
