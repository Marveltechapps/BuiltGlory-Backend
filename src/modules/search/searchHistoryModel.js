import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  term: { type: String, required: true, trim: true, maxlength: 100 },
  normalizedTerm: { type: String, required: true, trim: true, lowercase: true, maxlength: 100, index: true },
  resultCount: { type: Number, default: 0, min: 0 },
  source: { type: String, enum: ["customer_app"], default: "customer_app" }
}, { timestamps: true, collection: "searchHistory" });

searchHistorySchema.index({ userId: 1, updatedAt: -1 });
searchHistorySchema.index({ normalizedTerm: 1, updatedAt: -1 });

export const SearchHistory = mongoose.models.SearchHistory || mongoose.model("SearchHistory", searchHistorySchema);
