import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { controller } from "./controller.js";
import { service } from "./service.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, createValidator, updateValidator, statusValidator } from "./validator.js";
import { service as documentService } from "../documents/service.js";
import { badRequest, forbidden, notFound } from "../../shared/errors/AppError.js";
import { PropertyImportJob } from "./importJobModel.js";
import { Property } from "./model.js";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();
const requiredBulkFields = ["title", "type", "city", "locality", "pincode", "price"];
const coreTemplateFields = [
  { key: "propertyId", label: "Property ID", required: false, editable: false, type: "text" },
  { key: "referenceId", label: "Reference ID", required: false, editable: false, type: "text" },
  { key: "title", label: "Title", required: true, editable: true, type: "text" },
  { key: "type", label: "Type", required: true, editable: true, type: "select" },
  { key: "city", label: "City", required: true, editable: true, type: "text" },
  { key: "locality", label: "Locality", required: true, editable: true, type: "text" },
  { key: "pincode", label: "Pincode", required: true, editable: true, type: "text" },
  { key: "price", label: "Price", required: true, editable: true, type: "number" },
  { key: "description", label: "Description", required: false, editable: true, type: "text" },
  { key: "status", label: "Status", required: false, editable: true, type: "select" },
  { key: "source", label: "Source", required: false, editable: true, type: "text" },
  { key: "address", label: "Address Line 1", required: false, editable: true, type: "text" },
  { key: "line2", label: "Address Line 2", required: false, editable: true, type: "text" },
  { key: "state", label: "State", required: false, editable: true, type: "text" },
  { key: "landmark", label: "Landmark", required: false, editable: true, type: "text" },
  { key: "latitude", label: "Latitude", required: false, editable: true, type: "number" },
  { key: "longitude", label: "Longitude", required: false, editable: true, type: "number" },
  { key: "isNegotiable", label: "Negotiable", required: false, editable: true, type: "boolean" },
  { key: "isFeatured", label: "Featured", required: false, editable: true, type: "boolean" },
  { key: "isUpcoming", label: "Upcoming", required: false, editable: true, type: "boolean" },
  { key: "isVisibleOnApp", label: "Visible On App", required: false, editable: true, type: "boolean" },
  { key: "launchDate", label: "Launch Date", required: false, editable: true, type: "text" },
  { key: "possessionDate", label: "Possession Date", required: false, editable: true, type: "text" },
  { key: "amenities", label: "Amenities", required: false, editable: true, type: "list" },
  { key: "highlights", label: "Highlights", required: false, editable: true, type: "list" },
  { key: "photos", label: "Photo URLs", required: false, editable: true, type: "list" },
  { key: "coverPhoto", label: "Cover Photo URL", required: false, editable: true, type: "text" },
  { key: "videoUrl", label: "Video URL", required: false, editable: true, type: "text" },
  { key: "droneImageUrl", label: "Drone Image URL", required: false, editable: true, type: "text" },
  { key: "tour3dUrl", label: "3D Tour URL", required: false, editable: true, type: "text" },
  { key: "floorPlanUrl", label: "Floor Plan URL", required: false, editable: true, type: "text" },
  { key: "advantagesInvestment", label: "Investment Advantages", required: false, editable: true, type: "list" },
  { key: "advantagesLocation", label: "Location Advantages", required: false, editable: true, type: "list" },
  { key: "advantagesConnectivity", label: "Connectivity Advantages", required: false, editable: true, type: "list" },
  { key: "nearbyPlaces", label: "Nearby Places JSON", required: false, editable: true, type: "text" }
];
const specTemplateKeys = [
  "transactionType", "possession", "bhk", "bhkConfig", "subType", "actualPropertyType", "propertyType",
  "builtUpArea", "builtUp", "superBuiltUp", "carpetArea", "plotArea", "landArea", "landAreaAcres", "totalArea", "totalLandArea", "mainHouseArea", "roomArea",
  "areaUnit", "plotType", "landType", "commercialType", "holidayHomeType", "underlyingPropertyType", "nriPropertyType", "nriSellerType",
  "layoutName", "plotNumber", "surveyNumber", "dimensions", "plotDimension", "totalPlotsInLayout", "roadWidth", "roadType", "roadAccess", "accessibility",
  "facing", "cornerPlot", "approvalType", "approval", "approvalNumber", "dtcpApproved", "cmdaApproved", "reraNumber", "pattaAvailable", "pattaNumber", "ecAvailable", "titleType", "boundaryMarked", "loanApproved", "legalIssues", "legalIssueDetails",
  "waterConnection", "waterSource", "ebConnection", "electricity", "powerLoad", "powerBackup", "solarPanels", "solarCapacity", "solarType", "rainwaterHarvesting", "evCharging",
  "floor", "floorNumber", "floors", "totalFloors", "flatsOnFloor", "unitNumber", "towerName", "builderName", "projectName", "societyName",
  "bedrooms", "bathrooms", "balcony", "balconies", "balconyTerrace", "washrooms", "washroomsCount", "cabins", "meetingRooms", "pantry", "servantRoom", "staffQuarters", "homeOffice", "homeTheatre", "gym", "wineCellar", "bar", "poojaRoom", "pujaRoom", "terrace", "terraceArea",
  "furnishing", "parking", "parkingType", "parkingSlots", "parkingCount", "parkingCapacity", "carParking", "dedicatedParking", "lift", "liftCount", "liftCapacity", "elevator", "loadingBay",
  "age", "propertyAge", "possessionStatus", "ocStatus", "ocReceived", "ocCcStatus", "maintenanceCharges", "maintenancePerMonth", "monthlyMaintenance", "saleLeasePrice", "pricePerSqft",
  "vastuCompliant", "compoundWall", "garden", "gardenArea", "swimmingPool", "privatePool", "poolType", "jacuzzi", "generator", "generatorBackup", "security", "securitySystem",
  "ownershipType", "khataType", "khataNumber", "loanOnProperty", "revenueVillage", "taluk", "naConversion", "naOrderNumber", "fencing", "soilType", "topography", "plantation", "plantationType", "govtAcquisitionThreat",
  "constructionMaterial", "greenCertification", "certificationNumber", "ventilationType", "naturalLighting", "organicGarden", "compostPit", "composting", "constructionYear", "printTechnology", "estimatedCompletion", "structuralWarranty", "seismicZone", "energyRating",
  "smartHome", "smartHomeSystem", "smartHomeBrand", "voiceControl", "autoLighting", "smartSecurity", "automationLevel",
  "suitableFor", "frontageWidth", "ceilingHeight", "floorType", "falseCeiling", "currentlyLeased", "tenantName", "rentalIncome", "monthlyRentalIncome", "leaseExpiry", "rentalYield",
  "propertyLocation", "totalPropertyValue", "fractionSize", "sharePercentage", "shareValue", "minInvestment", "minimumInvestment", "expectedReturns", "expectedROI", "rentalIncomeShare", "lockInPeriod", "exitOption", "buybackGuarantee", "propertyManager", "totalUnits", "unitsAvailable", "legalStructure",
  "viewType", "distanceBeachHills", "distanceFromBangalore", "distanceFromCity", "nearestCity", "nearestAirport", "rentalPlatform", "occupancyRate", "managedProperty", "managementFee",
  "mainHouseBHK", "numberOfBuildings", "borewell", "borewellDepth", "borewellYield", "farmLand", "fruitTrees", "cultivated", "cropType", "numberOfTrees", "annualCropIncome", "caretaker", "animalHusbandry",
  "countryOfResidence", "cityOfResidence", "femaCompliant", "femaCompliance", "nriFriendly", "powerOfAttorney", "poaHolderName", "poaHolderPhone", "poaRegistered", "tdsAcknowledged", "taxAdvisor", "nriLoanAvailable", "preferredContactTime", "timeZone", "inspectionMode", "virtualTourAvailable", "currencyPreference", "paymentMode", "docsInIndia",
  "expectedStartDate", "scopeOfWork", "designStyle", "style", "budgetRange", "colorPreference", "flooringRequired", "modularKitchen", "kitchenStyle", "timeline", "timelineWeeks", "existingFurniture", "brandPreferences", "specialRequirements"
];
const numberTemplateKeys = new Set([
  "price", "latitude", "longitude", "builtUpArea", "builtUp", "superBuiltUp", "carpetArea", "plotArea", "landArea", "landAreaAcres", "totalArea", "totalLandArea", "mainHouseArea", "roomArea", "roadWidth", "totalPlotsInLayout", "floorNumber", "floors", "totalFloors", "flatsOnFloor", "bedrooms", "bathrooms", "balcony", "balconies", "washrooms", "washroomsCount", "cabins", "meetingRooms", "parkingSlots", "parkingCount", "parkingCapacity", "liftCount", "liftCapacity", "maintenanceCharges", "maintenancePerMonth", "monthlyMaintenance", "saleLeasePrice", "pricePerSqft", "gardenArea", "terraceArea", "solarCapacity", "constructionYear", "frontageWidth", "ceilingHeight", "rentalIncome", "monthlyRentalIncome", "rentalYield", "totalPropertyValue", "sharePercentage", "shareValue", "minInvestment", "minimumInvestment", "expectedReturns", "expectedROI", "lockInPeriod", "totalUnits", "unitsAvailable", "occupancyRate", "managementFee", "distanceFromBangalore", "distanceFromCity", "numberOfBuildings", "borewellDepth", "borewellYield", "numberOfTrees", "annualCropIncome", "timelineWeeks"
]);
const listTemplateKeys = new Set(["amenities", "highlights", "photos", "advantagesInvestment", "advantagesLocation", "advantagesConnectivity"]);
const booleanTemplateKeys = new Set(["isNegotiable", "isFeatured", "isUpcoming", "isVisibleOnApp"]);
const uniqueKeys = (keys) => [...new Set(keys)];
const templateTypeFor = (key) => listTemplateKeys.has(key) ? "list" : booleanTemplateKeys.has(key) ? "boolean" : numberTemplateKeys.has(key) ? "number" : "text";
const labelForKey = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()).trim();
const bulkTemplateFields = [
  ...coreTemplateFields,
  ...uniqueKeys(specTemplateKeys).map((key) => ({ key, label: labelForKey(key), required: false, editable: true, type: templateTypeFor(key) }))
];
const propertyTypes = new Set(["plot", "apartment", "residential", "commercial", "organic_home", "3d_printing", "fractional", "ceo_mansion", "holiday_home", "land", "farmhouse", "nri", "interior", "villa"]);
const FEATURED_LIMIT = 20;
const typeAliases = {
  flat: "apartment",
  flats: "apartment",
  apartments: "apartment",
  villa: "villa",
  villas: "villa",
  plot: "plot",
  plots: "plot",
  land: "land",
  commercial: "commercial",
  residential: "residential",
  house: "residential",
  interior: "interior",
  organic: "organic_home",
  organic_home: "organic_home",
  "organic-home": "organic_home",
  "3d": "3d_printing",
  "3d_printing": "3d_printing",
  "3d_print": "3d_printing",
  "3d-print": "3d_printing",
  "3d-printing-home": "3d_printing",
  fractional: "fractional",
  "fractional-ownership": "fractional",
  ceo: "ceo_mansion",
  ceo_mansion: "ceo_mansion",
  "ceo-mansion": "ceo_mansion",
  holiday: "holiday_home",
  holiday_home: "holiday_home",
  "holiday-home": "holiday_home",
  farmhouse: "farmhouse",
  farm: "farmhouse",
  "farm-house": "farmhouse",
  nri: "nri",
  "nri-services": "nri"
};
const text = (value) => String(value ?? "").trim();
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const bool = (value) => ["true", "yes", "1", "y"].includes(text(value).toLowerCase());
const list = (value) => text(value).split(",").map((item) => item.trim()).filter(Boolean);
const dateValue = (value) => text(value) || undefined;
const jsonArray = (value) => {
  const raw = text(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw.split(";").map((entry) => {
      const [name, type, distance] = entry.split("|").map((item) => item?.trim() || "");
      return { name, type, distance };
    }).filter((item) => item.name);
  }
};
const specValue = (row, key) => {
  const value = row[key];
  if (value === undefined || value === null || text(value) === "") return undefined;
  return numberTemplateKeys.has(key) ? number(value) : value;
};
const specsFromTemplateRow = (row) => {
  const specs = {};
  for (const key of uniqueKeys(specTemplateKeys)) {
    const value = specValue(row, key);
    if (value !== undefined) specs[key] = value;
  }
  if (specs.builtUpArea === undefined && row.area !== undefined) specs.builtUpArea = number(row.area);
  return specs;
};
const normalizeType = (value) => {
  const normalized = text(value).toLowerCase().replace(/[\s-]+/g, "_");
  return typeAliases[normalized] || (propertyTypes.has(normalized) ? normalized : "");
};
const importJobQuery = (id) => id.match(/^[a-f\d]{24}$/i) ? { $or: [{ _id: id }, { referenceId: id }] } : { referenceId: id };
const importJobPopulate = (query) => query.populate("importedProperties", "referenceId title status isDeleted");
const buildReferenceId = (jobReferenceId, row, index) => text(row.referenceId || row.propertyId || row.id) || `${jobReferenceId}-ROW-${index + 2}`;
const parseBulkRows = async (file) => {
  if (!file) throw badRequest("A CSV or XLSX file is required.");
  const name = file.originalname.toLowerCase();
  const workbook = new ExcelJS.Workbook();
  if (name.endsWith(".csv")) {
    const lines = file.buffer.toString("utf8").split(/\r?\n/).filter(Boolean);
    const headers = lines.shift()?.split(",").map((value) => value.trim()) || [];
    return lines.map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
    });
  }
  if (!name.endsWith(".xlsx")) throw badRequest("Only CSV and XLSX files are supported.");
  await workbook.xlsx.load(file.buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw badRequest("Uploaded file does not contain a worksheet.");
  const headers = worksheet.getRow(1).values.slice(1).map((value) => String(value || "").trim());
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item = {};
    row.values.slice(1).forEach((value, index) => { item[headers[index]] = value; });
    rows.push(item);
  });
  return rows;
};
const validateBulkRows = (rows) => {
  const errors = [];
  const referenceIds = new Set();
  rows.forEach((row, index) => {
    requiredBulkFields.forEach((field) => {
      if (row[field] === undefined || row[field] === "") errors.push({ row: index + 2, field, message: "Required field is missing." });
    });
    const type = normalizeType(row.type);
    if (row.type && !type) errors.push({ row: index + 2, field: "type", message: "Property type is not supported." });
    if (row.pincode && !/^\d{6}$/.test(String(row.pincode))) errors.push({ row: index + 2, field: "pincode", message: "Pincode must contain 6 digits." });
    if (row.price !== "" && !(Number(row.price) > 0)) errors.push({ row: index + 2, field: "price", message: "Price must be positive." });
    const referenceId = text(row.referenceId || row.propertyId || row.id);
    if (referenceId) {
      if (referenceIds.has(referenceId)) errors.push({ row: index + 2, field: "referenceId", message: "Duplicate reference ID in uploaded file." });
      referenceIds.add(referenceId);
    }
  });
  return errors;
};
const mapBulkRowToProperty = (row, jobReferenceId, index) => ({
  referenceId: buildReferenceId(jobReferenceId, row, index),
  title: text(row.title),
  description: text(row.description),
  type: normalizeType(row.type),
  status: ["available", "sold", "reserved", "under_construction", "draft"].includes(text(row.status).toLowerCase()) ? text(row.status).toLowerCase() : "available",
  source: text(row.source) || "bulk_upload",
  isFeatured: bool(row.isFeatured),
  isUpcoming: bool(row.isUpcoming),
  isVisibleOnApp: row.isVisibleOnApp === undefined || text(row.isVisibleOnApp) === "" ? true : bool(row.isVisibleOnApp),
  launchDate: dateValue(row.launchDate),
  possessionDate: dateValue(row.possessionDate),
  sourceSheet: jobReferenceId,
  address: {
    line1: text(row.address || row.line1),
    line2: text(row.line2),
    locality: text(row.locality),
    city: text(row.city),
    state: text(row.state || "Karnataka"),
    pincode: text(row.pincode),
    landmark: text(row.landmark),
    latitude: number(row.latitude),
    longitude: number(row.longitude)
  },
  price: number(row.price) || 0,
  isNegotiable: bool(row.isNegotiable || row.negotiable),
  specs: specsFromTemplateRow(row),
  amenities: list(row.amenities),
  highlights: list(row.highlights),
  media: {
    photos: list(row.photos),
    coverPhoto: text(row.coverPhoto),
    videoUrl: text(row.videoUrl),
    droneImageUrl: text(row.droneImageUrl),
    tour3dUrl: text(row.tour3dUrl),
    floorPlanUrl: text(row.floorPlanUrl)
  },
  advantages: {
    investment: list(row.advantagesInvestment),
    location: list(row.advantagesLocation),
    connectivity: list(row.advantagesConnectivity)
  },
  nearbyPlaces: jsonArray(row.nearbyPlaces)
});
const csvList = (value) => Array.isArray(value) ? value.filter(Boolean).join(", ") : text(value);
const propertyToTemplateRow = (property) => ({
  propertyId: String(property._id || property.id || ""),
  referenceId: text(property.referenceId),
  title: text(property.title),
  type: text(property.type),
  source: text(property.source),
  city: text(property.address?.city),
  locality: text(property.address?.locality),
  pincode: text(property.address?.pincode),
  price: property.price ?? "",
  description: text(property.description),
  status: text(property.status),
  address: text(property.address?.line1),
  line2: text(property.address?.line2),
  state: text(property.address?.state),
  landmark: text(property.address?.landmark),
  latitude: property.address?.latitude ?? "",
  longitude: property.address?.longitude ?? "",
  isNegotiable: Boolean(property.isNegotiable),
  isFeatured: Boolean(property.isFeatured),
  isUpcoming: Boolean(property.isUpcoming),
  isVisibleOnApp: property.isVisibleOnApp !== false,
  launchDate: property.launchDate ? new Date(property.launchDate).toISOString().slice(0, 10) : "",
  possessionDate: property.possessionDate ? new Date(property.possessionDate).toISOString().slice(0, 10) : "",
  amenities: csvList(property.amenities),
  highlights: csvList(property.highlights),
  photos: csvList(property.media?.photos),
  coverPhoto: text(property.media?.coverPhoto),
  videoUrl: text(property.media?.videoUrl),
  droneImageUrl: text(property.media?.droneImageUrl),
  tour3dUrl: text(property.media?.tour3dUrl),
  floorPlanUrl: text(property.media?.floorPlanUrl),
  advantagesInvestment: csvList(property.advantages?.investment),
  advantagesLocation: csvList(property.advantages?.location),
  advantagesConnectivity: csvList(property.advantages?.connectivity),
  nearbyPlaces: property.nearbyPlaces?.length ? JSON.stringify(property.nearbyPlaces) : "",
  ...Object.fromEntries(uniqueKeys(specTemplateKeys).map((key) => [key, property.specs?.[key] ?? ""]))
});
const mapPropertyQuery = (query) => {
  return { ...query };
};
router.get("/properties", validate(listValidator), controller.action(async (req, res) => {
  const recentlySold = req.query.recentlySold === true || req.query.recentlySold === "true";
  req.query.status = recentlySold ? "sold" : (req.query.status || ["available", "reserved", "under_construction"]);
  req.query.isVisibleOnApp = true;
  const result = await service.list(mapPropertyQuery(req.query), req.actor);
  res.json({ data: result.data, meta: { ...result.meta, requestId: res.locals.requestId } });
}));
router.get("/properties/:propertyId", controller.action(async (req, res) => {
  const { Property } = await import("./model.js");
  const data = await Property.findOne({ _id: req.params.propertyId, status: { $in: ["available", "reserved", "under_construction"] }, isDeleted: { $ne: true } });
  if (!data) throw notFound("Property not found.");
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.post("/properties/:propertyId/save", authenticate("customer"), controller.action(async (req, res) => {
  const { Property } = await import("./model.js");
  const property = await Property.findOne({ _id: req.params.propertyId, status: { $in: ["available", "reserved", "under_construction"] }, isDeleted: { $ne: true } });
  if (!property) throw notFound("Property not found.");
  const alreadySaved = property.savedByUsers?.some((id) => String(id) === String(req.actor.id));
  if (!alreadySaved) {
    property.savedByUsers.push(req.actor.id);
    property.metrics.savedCount += 1;
    await property.save();
  }
  res.json({ data: property, meta: { requestId: res.locals.requestId } });
}));
router.delete("/properties/:propertyId/save", authenticate("customer"), controller.action(async (req, res) => {
  const { Property } = await import("./model.js");
  const property = await Property.findOne({ _id: req.params.propertyId, savedByUsers: req.actor.id, isDeleted: { $ne: true } });
  if (property) {
    property.savedByUsers = property.savedByUsers.filter((id) => String(id) !== String(req.actor.id));
    property.metrics.savedCount = Math.max(0, property.metrics.savedCount - 1);
    await property.save();
  }
  res.status(204).send();
}));
router.get("/me/favorites", authenticate("customer"), controller.action(async (req, res) => { const { Property } = await import("./model.js"); const data = await Property.find({ savedByUsers: req.actor.id, status: { $in: ["available", "reserved", "under_construction"] }, isDeleted: { $ne: true } }); res.json({ data, meta: { requestId: res.locals.requestId } }); }));
router.get("/admin/properties", authenticate("admin"), requirePermission("properties.read"), validate(listValidator), controller.action(async (req, res) => { const result = await service.list(mapPropertyQuery(req.query), req.actor); res.json({ data: result.data, meta: { ...result.meta, requestId: res.locals.requestId } }); }));
router.post("/admin/properties", authenticate("admin"), requirePermission("properties.write"), validate(createValidator), controller.create);
router.get("/admin/properties/import-jobs", authenticate("admin"), requirePermission("properties.read"), controller.action(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const data = await importJobPopulate(PropertyImportJob.find({}).sort({ createdAt: -1 }).limit(limit));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/import-jobs", authenticate("admin"), requirePermission("properties.read"), controller.action(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const data = await importJobPopulate(PropertyImportJob.find({}).sort({ createdAt: -1 }).limit(limit));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/import-jobs/:id", authenticate("admin"), requirePermission("properties.read"), controller.action(async (req, res) => {
  const data = await importJobPopulate(PropertyImportJob.findOne(importJobQuery(req.params.id)));
  if (!data) throw notFound("Import job not found.");
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/properties/bulk-template", authenticate("admin"), requirePermission("properties.read"), controller.action(async (req, res) => {
  const mode = req.query.mode === "valued" ? "valued" : "empty";
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const total = mode === "valued" ? await Property.countDocuments({ isDeleted: { $ne: true } }) : 0;
  const rows = mode === "valued"
    ? (await Property.find({ isDeleted: { $ne: true } }).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).lean()).map(propertyToTemplateRow)
    : [];
  res.json({ data: { mode, fields: bulkTemplateFields, rows }, meta: { requestId: res.locals.requestId, total, limit } });
}));
router.post("/admin/import-jobs/:id/undo", authenticate("admin"), requirePermission("properties.write"), controller.action(async (req, res) => {
  const job = await PropertyImportJob.findOne(importJobQuery(req.params.id));
  if (!job) throw notFound("Import job not found.");
  if (job.status === "reverted") throw badRequest("Import job has already been reverted.");
  if (!job.importedProperties?.length) throw badRequest("This import job did not create any properties.");
  const now = new Date();
  const result = await Property.updateMany(
    { _id: { $in: job.importedProperties }, source: "bulk_upload", isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: now, deletedBy: req.actor.id } }
  );
  job.status = "reverted";
  job.revertedAt = now;
  job.revertedBy = req.actor.id;
  await job.save();
  const data = await importJobPopulate(PropertyImportJob.findById(job._id));
  res.json({ data: { job: data, revertedCount: result.modifiedCount || 0 }, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/properties/:propertyId", authenticate("admin"), requirePermission("properties.read"), controller.get);
router.patch("/admin/properties/:propertyId", authenticate("admin"), requirePermission("properties.write"), validate(updateValidator), controller.action(async (req, res, next) => {
  if ((req.body.isFeatured !== undefined || req.body.isUpcoming !== undefined) && req.actor.role !== "super_admin" && !req.actor.permissions?.includes("properties.publish")) return next(forbidden("Publishing and editorial flags require properties.publish."));
  if (req.body.isFeatured === true) {
    const featuredCount = await Property.countDocuments({ _id: { $ne: req.params.propertyId }, isFeatured: true, isDeleted: { $ne: true } });
    if (featuredCount >= FEATURED_LIMIT) throw badRequest(`Only ${FEATURED_LIMIT} properties can be featured at a time.`);
  }
  const data = await service.update(req.params.propertyId, req.body, req.actor, req);
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.delete("/admin/properties/:propertyId", authenticate("admin"), requirePermission("properties.write"), controller.action(async (req, res) => {
  const data = await service.remove(req.params.propertyId, req.actor, req);
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/properties/:propertyId/restore", authenticate("admin"), requirePermission("properties.write"), controller.action(async (req, res) => {
  const data = await Property.findOneAndUpdate(
    { _id: req.params.propertyId, isDeleted: true },
    { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } },
    { new: true, runValidators: true }
  );
  if (!data) throw notFound("Property not found in trash.");
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.delete("/admin/properties/:propertyId/permanent", authenticate("admin"), requirePermission("properties.write"), controller.action(async (req, res) => {
  const data = await Property.findOneAndDelete({ _id: req.params.propertyId, isDeleted: true });
  if (!data) throw notFound("Property not found in trash.");
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.post("/admin/properties/:propertyId/media", authenticate("admin"), requirePermission("properties.write"), upload.array("files", 20), controller.action(async (req, res) => {
  const { Property } = await import("./model.js");
  const property = await Property.findOne({ _id: req.params.propertyId, isDeleted: { $ne: true } });
  if (!property) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Property not found.", details: [] }, meta: { requestId: res.locals.requestId } });
  const documents = [];
  for (const file of req.files || []) {
    documents.push(await documentService.createFromMultipart({ file, body: { ownerType: "property", ownerId: property._id, purpose: "property_media", documentType: req.body.documentType || "photo" } }, req.actor));
  }
  const urls = documents.filter((doc) => doc.scanStatus === "clean" && doc.status === "verified").map((doc) => doc.url).filter(Boolean);
  if (urls.length) {
    property.media = property.media || {};
    property.media.photos = [...(property.media.photos || []), ...urls];
    if (!property.media.coverPhoto) property.media.coverPhoto = urls[0];
    await property.save();
  }
  res.status(201).json({ data: { property, documents, pendingReview: documents.filter((doc) => doc.scanStatus !== "clean" || doc.status !== "verified").length }, meta: { requestId: res.locals.requestId } });
}));
router.patch("/admin/properties/:propertyId/status", authenticate("admin"), requirePermission("properties.publish"), validate(statusValidator), controller.transition("status"));
router.post("/admin/properties/bulk-upload", authenticate("admin"), requirePermission("properties.write"), upload.single("file"), controller.action(async (req, res) => {
  const rows = await parseBulkRows(req.file);
  const errors = validateBulkRows(rows);
  const rejectedRows = new Set(errors.map((error) => error.row));
  const rowsAccepted = rows.length - rejectedRows.size;
  const rowsRejected = rejectedRows.size;
  const referenceId = `IMPORT-${new Date().getUTCFullYear()}-${Date.now()}`;
  const createdProperties = [];
  if (!errors.length) {
    try {
      createdProperties.push(...await Property.insertMany(rows.map((row, index) => mapBulkRowToProperty(row, referenceId, index)), { ordered: true }));
    } catch (error) {
      throw badRequest("Could not import properties. Check for duplicate property IDs or invalid row values.", [{ field: "file", message: error.message }]);
    }
  }
  const job = await PropertyImportJob.create({
    referenceId,
    fileName: req.file?.originalname || "upload",
    status: errors.length === 0 ? "completed" : "rejected",
    rowsTotal: rows.length,
    rowsAccepted,
    rowsRejected,
    errors,
    importedProperties: createdProperties.map((property) => property._id),
    requestedBy: req.actor.id,
    completedAt: new Date()
  });
  const data = await importJobPopulate(PropertyImportJob.findById(job._id));
  res.status(201).json({ data: { valid: errors.length === 0, rowsAccepted, rowsRejected, errors, job: data }, meta: { requestId: res.locals.requestId } });
}));
export default router;