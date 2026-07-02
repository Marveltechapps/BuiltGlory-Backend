import mongoose from "mongoose";

const importJobSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true },
    status: { type: String, enum: ["validated", "rejected", "processing", "completed", "failed", "reverted"], default: "validated", index: true },
    rowsTotal: { type: Number, default: 0 },
    rowsAccepted: { type: Number, default: 0 },
    rowsRejected: { type: Number, default: 0 },
    errors: [{ row: Number, field: String, message: String }],
    importedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    revertedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    revertedAt: Date,
    completedAt: Date
  },
  { timestamps: true, collection: "propertyImportJobs", toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

importJobSchema.index({ requestedBy: 1, createdAt: -1 });

export const PropertyImportJob =
  mongoose.models.PropertyImportJob || mongoose.model("PropertyImportJob", importJobSchema);
