import mongoose from "mongoose";
import { PROPERTY_TYPES, PROPERTY_STATUSES, PROPERTY_SOURCES } from "../../constants/enums.js";
export const collectionName = "properties";
export const schemaDefinition = {
  referenceId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true }, description: String, type: { type: String, enum: PROPERTY_TYPES, required: true },
  status: { type: String, enum: PROPERTY_STATUSES, default: "draft", index: true }, source: { type: String, enum: PROPERTY_SOURCES, default: "manual" },
  isFeatured: { type: Boolean, default: false }, isUpcoming: { type: Boolean, default: false },
  address: { line1: String, line2: String, locality: String, city: String, state: String, pincode: String, landmark: String, latitude: Number, longitude: Number, location: { type: { type: String, enum: ["Point"] }, coordinates: [Number] } },
  price: { type: Number, min: 0, required: true }, isNegotiable: { type: Boolean, default: false },
  specs: { bhk: String, builtUpArea: Number, carpetArea: Number, plotArea: Number, floor: String, totalFloors: Number, facing: String, age: String, furnishing: String, parking: String, reraNumber: String, possession: String, vastuCompliant: Boolean, transactionType: String },
  amenities: [String], media: { photos: [String], coverPhoto: String, videoUrl: String, droneImageUrl: String, tour3dUrl: String, floorPlanUrl: String },
  advantages: { investment: [String], location: [String], connectivity: [String] }, nearbyPlaces: [{ name: String, type: String, distance: String }], highlights: [String],
  metrics: { savedCount: { type: Number, default: 0 }, views: { type: Number, default: 0 }, enquiries: { type: Number, default: 0 }, visits: { type: Number, default: 0 }, compareCount: { type: Number, default: 0 } },
  savedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, sourceSheet: String, acquisitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Acquisition" }, launchDate: Date, possessionDate: Date, soldAt: Date
};
export const configureSchema = (schema) => {
  schema.index({ status: 1, type: 1, "address.city": 1 });
  schema.index({ isFeatured: 1, status: 1 });
  schema.index({ isUpcoming: 1, launchDate: 1 });
  schema.index({ "address.location": "2dsphere" }, { sparse: true });
  schema.index({ title: "text", description: "text", "address.locality": "text", "address.city": "text", referenceId: "text" });
  schema.pre("validate", function () { if (this.isUpcoming && !this.launchDate) throw new Error("Upcoming properties require launchDate."); });
};