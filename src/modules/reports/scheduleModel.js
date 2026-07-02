import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "paused"], default: "active", index: true },
    reportType: { type: String, enum: ["overview", "sales", "acquisition", "revenue", "users", "properties"], required: true },
    format: { type: String, enum: ["csv", "xlsx", "pdf"], default: "xlsx" },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    recipients: [{ type: String, required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", index: true },
    lastRunAt: Date,
    nextRunAt: { type: Date, required: true, index: true }
  },
  {
    timestamps: true,
    collection: "reportSchedules",
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.index({ status: 1, nextRunAt: 1 });

export const ReportSchedule = mongoose.models.ReportSchedule || mongoose.model("ReportSchedule", schema);
