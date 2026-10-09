import { PROPERTY_TYPES } from "../../constants/enums.js";
import { normalizePropertyType } from "../properties/propertyTypeUtils.js";

export const SELL_LIMITS = {
  titleMin: 8,
  titleMax: 200,
  streetMin: 3,
  streetMax: 120,
  localityMax: 80,
  cityMin: 2,
  cityMax: 80,
  areaMin: 50,
  areaMax: 1_000_000,
  priceMin: 50_000,
  priceMax: 50_000_000_000,
  floorMin: -5,
  floorMax: 200,
  totalFloorsMin: 1,
  totalFloorsMax: 200,
  parkingMin: 0,
  parkingMax: 50,
  descriptionMax: 5000,
  photosMin: 5,
  photosMax: 30,
  amenityMax: 60,
  sharePercentMin: 0.01,
  sharePercentMax: 100
};

export const SELL_PROPERTY_TYPE_INPUTS = [
  ...PROPERTY_TYPES,
  "villa",
  "flat",
  "flats",
  "3d-print",
  "3d_print",
  "organic",
  "ceo-mansion",
  "ceo",
  "holiday",
  "farm",
  "house"
];

export const PIN_PATTERN = /^\d{6}$/;
export const PHONE_PATTERN = /^[6-9]\d{9}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const text = (value) => String(value || "").trim();

export const sellTypeCategory = (type) => {
  const normalized = normalizePropertyType(type) || String(type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "plot") return "plot";
  if (normalized === "land") return "land";
  if (normalized === "apartment") return "apartment";
  if (normalized === "nri") return "nri";
  if (normalized === "commercial") return "commercial";
  if (normalized === "fractional") return "fractional";
  if (normalized === "interior") return "interior";
  if (["villa", "residential", "farmhouse", "ceo_mansion", "organic_home", "holiday_home", "3d_printing"].includes(normalized)) {
    return "residential";
  }
  return "other";
};

export const collectSubmissionIssues = (data = {}, seller) => {
  const missing = [];
  const specs = data.specifications || {};
  const category = sellTypeCategory(data.propertyType);
  const title = text(data.propertyTitle);
  const street = text(data.address?.street);
  const city = text(data.address?.city);
  const pincode = text(data.address?.pincode);
  const askingPrice = number(data.askingPrice);
  const photoCount = Array.isArray(data.photos)
    ? data.photos.filter(Boolean).length
    : Math.max(Number(data.photosCount) || 0, (data.documents || []).filter((doc) => doc?.fileUrl && !["rejected", "missing"].includes(doc.status)).length);

  if (seller && !["seller", "both"].includes(seller.role)) {
    missing.push({ field: "role", message: "Seller role is required for submission." });
  }
  if (!data.propertyType) {
    missing.push({ field: "propertyType", message: "Select a property type." });
  } else if (!normalizePropertyType(data.propertyType) && !PROPERTY_TYPES.includes(String(data.propertyType || "").toLowerCase().replace(/[\s-]+/g, "_"))) {
    missing.push({ field: "propertyType", message: "Select a valid property type." });
  }
  if (!title) missing.push({ field: "propertyTitle", message: "Enter a property title." });
  else if (title.length < SELL_LIMITS.titleMin) missing.push({ field: "propertyTitle", message: `Property title must be at least ${SELL_LIMITS.titleMin} characters.` });
  else if (title.length > SELL_LIMITS.titleMax) missing.push({ field: "propertyTitle", message: `Property title cannot exceed ${SELL_LIMITS.titleMax} characters.` });

  if (!street || street.length < SELL_LIMITS.streetMin) missing.push({ field: "address.street", message: "Enter building / society name." });
  if (!city || city.length < SELL_LIMITS.cityMin) missing.push({ field: "address.city", message: "Enter a valid city." });
  if (!PIN_PATTERN.test(pincode) || pincode === "000000") missing.push({ field: "address.pincode", message: "Enter a valid 6-digit PIN code." });

  if (!(askingPrice > 0)) missing.push({ field: "askingPrice", message: "Enter a valid asking price." });
  else if (askingPrice < SELL_LIMITS.priceMin || askingPrice > SELL_LIMITS.priceMax) {
    missing.push({ field: "askingPrice", message: `Asking price must be between ₹${SELL_LIMITS.priceMin.toLocaleString("en-IN")} and ₹${SELL_LIMITS.priceMax.toLocaleString("en-IN")}.` });
  }

  if (category !== "interior" && !text(data.ownershipType)) {
    missing.push({ field: "ownershipType", message: "Select ownership type." });
  }
  if (photoCount < SELL_LIMITS.photosMin) missing.push({ field: "photos", message: `Upload at least ${SELL_LIMITS.photosMin} photos.` });
  if (photoCount > SELL_LIMITS.photosMax) missing.push({ field: "photos", message: `You can upload a maximum of ${SELL_LIMITS.photosMax} photos.` });

  const builtUp = number(specs.builtUpArea);
  const plotArea = number(specs.plotArea) || number(specs.area) || number(specs.totalArea);
  if (["apartment", "residential", "nri"].includes(category)) {
    if (!hasValue(specs.bhk)) missing.push({ field: "specifications.bhk", message: "Select BHK configuration." });
    if (!(builtUp >= SELL_LIMITS.areaMin)) missing.push({ field: "specifications.builtUpArea", message: "Enter a valid built-up area." });
  }
  if (["plot", "land"].includes(category) && !(plotArea >= SELL_LIMITS.areaMin)) {
    missing.push({ field: "specifications.plotArea", message: "Enter a valid plot area." });
  }
  if (category === "commercial" && !(builtUp >= SELL_LIMITS.areaMin) && !(plotArea >= SELL_LIMITS.areaMin)) {
    missing.push({ field: "specifications.builtUpArea", message: "Enter a valid commercial area." });
  }
  if (category === "fractional") {
    const share = number(specs.sharePercentage);
    const totalValue = number(specs.totalPropertyValue);
    if (!(share >= SELL_LIMITS.sharePercentMin && share <= SELL_LIMITS.sharePercentMax)) {
      missing.push({ field: "specifications.sharePercentage", message: "Enter a valid share percentage." });
    }
    if (!(totalValue >= SELL_LIMITS.priceMin)) missing.push({ field: "specifications.totalPropertyValue", message: "Enter a valid total property value." });
  }
  if (category === "interior" && !hasValue(specs.scopeOfWork)) {
    missing.push({ field: "specifications.scopeOfWork", message: "Select interior scope of work." });
  }

  const furnishing = text(specs.furnishing || specs.furnish);
  if (furnishing && furnishing !== "Unfurnished" && text(furnishing).toLowerCase() !== "unfurnished" && !hasValue(specs.furnishDetails)) {
    missing.push({ field: "specifications.furnishDetails", message: "Describe furnishing details." });
  }
  const parking = number(specs.parking ?? specs.parkingCount);
  if (parking > 0 && !hasValue(specs.parkingType)) {
    missing.push({ field: "specifications.parkingType", message: "Select parking type." });
  }
  if (data.loanOnProperty) {
    const lender = text(data.loanDetails?.lender);
    const outstanding = number(data.loanDetails?.outstanding);
    if (!lender) missing.push({ field: "loanDetails.lender", message: "Enter the lender name." });
    if (!(outstanding > 0)) missing.push({ field: "loanDetails.outstanding", message: "Enter the outstanding loan amount." });
  }

  if (hasValue(specs.poaHolderPhone) && !PHONE_PATTERN.test(digitsOnly(specs.poaHolderPhone))) {
    missing.push({ field: "specifications.poaHolderPhone", message: "Enter a valid 10-digit POA phone number." });
  }
  if (hasValue(specs.poaHolderEmail) && !EMAIL_PATTERN.test(text(specs.poaHolderEmail).toLowerCase())) {
    missing.push({ field: "specifications.poaHolderEmail", message: "Enter a valid POA email address." });
  }
  if (hasValue(specs.virtualTourUrl)) {
    try {
      const parsed = new URL(String(specs.virtualTourUrl));
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid");
    } catch {
      missing.push({ field: "specifications.virtualTourUrl", message: "Enter a valid virtual tour URL." });
    }
  }
  if (hasValue(data.description) && text(data.description).length < 20) {
    missing.push({ field: "description", message: "Description must be at least 20 characters if provided." });
  }
  if (Array.isArray(data.amenities) && data.amenities.some((item) => text(item).length > SELL_LIMITS.amenityMax)) {
    missing.push({ field: "amenities", message: "Remove invalid amenity values." });
  }

  return missing;
};

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}
