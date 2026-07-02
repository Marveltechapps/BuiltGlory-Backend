import { Property } from "./model.js";
import { createRepository } from "../../shared/repositoryFactory.js";
import { getPagination, paginationMeta } from "../../shared/pagination.js";

const baseRepository = createRepository(Property);
const csv = (value) => Array.isArray(value) ? value : String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const regexAny = (values) => ({ $in: values.map((value) => new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) });
const sourceForPostedBy = (value) => ({
  owner: "manual",
  builder: "acquired",
  dealer: "bulk_upload"
})[String(value || "").toLowerCase()];
const propertyTypeAliases = {
  flat: "apartment",
  flats: "apartment",
  apartment: "apartment",
  apartments: "apartment",
  villa: "villa",
  villas: "villa",
  plot: "plot",
  plots: "plot",
  land: "land",
  commercial: "commercial",
  office: "commercial",
  residential: "residential",
  farmhouse: "farmhouse",
  farm: "farmhouse",
  nri: "nri",
  interior: "interior",
  "3d": "3d_printing",
  "3d_printing": "3d_printing",
  "3d_print": "3d_printing",
  organic: "organic_home",
  organic_home: "organic_home",
  ceo: "ceo_mansion",
  ceo_mansion: "ceo_mansion",
  holiday: "holiday_home",
  holiday_home: "holiday_home",
  fractional: "fractional"
};
const searchDerivedFilters = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const words = normalized.split("_").filter(Boolean);
  const filters = [];
  const type = propertyTypeAliases[normalized] || words.map((word) => propertyTypeAliases[word]).find(Boolean);
  if (type) filters.push({ type });
  const bhk = raw.match(/\b([1-9]\d?)\s*(?:bhk|bed|bedroom|bedrooms)\b/i)?.[1];
  if (bhk) filters.push({ "specs.bhk": { $in: [bhk, Number(bhk)] } });
  return filters;
};

const buildAreaFilter = ({ minArea, maxArea }) => {
  const areaRange = {};
  const min = number(minArea);
  const max = number(maxArea);
  if (min !== undefined) areaRange.$gte = min;
  if (max !== undefined) areaRange.$lte = max;
  if (!Object.keys(areaRange).length) return null;
  return {
    $or: [
      { "specs.builtUpArea": areaRange },
      { "specs.carpetArea": areaRange },
      { "specs.plotArea": areaRange },
      { "specs.area": areaRange }
    ]
  };
};

const buildFilter = (query = {}, forcedFilter = {}) => {
  const filter = query.deletedOnly === true || query.deletedOnly === "true"
    ? { isDeleted: true }
    : query.includeDeleted === true || query.includeDeleted === "true"
      ? {}
      : { isDeleted: { $ne: true } };
  if (query.type) filter.type = query.type;
  if (query.city) filter["address.city"] = new RegExp(String(query.city), "i");
  if (query.locality) filter["address.locality"] = new RegExp(String(query.locality), "i");
  if (query.featured !== undefined) filter.isFeatured = query.featured === true || query.featured === "true";
  if (query.upcoming !== undefined) filter.isUpcoming = query.upcoming === true || query.upcoming === "true";
  if (query.isVisibleOnApp !== undefined) filter.isVisibleOnApp = query.isVisibleOnApp === true || query.isVisibleOnApp === "true";
  if (query.verified !== undefined && (query.verified === true || query.verified === "true")) filter.status = "available";
  if (query.status) filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
  if (query.source) filter.source = query.source;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  const postedSource = sourceForPostedBy(query.postedBy);
  if (postedSource) filter.source = postedSource;

  const priceRange = {};
  const minPrice = number(query.minPrice);
  const maxPrice = number(query.maxPrice);
  if (minPrice !== undefined) priceRange.$gte = minPrice;
  if (maxPrice !== undefined) priceRange.$lte = maxPrice;
  if (Object.keys(priceRange).length) filter.price = priceRange;

  const and = [];
  const areaFilter = buildAreaFilter(query);
  if (areaFilter) and.push(areaFilter);

  const bhk = csv(query.bhk);
  if (bhk.length) and.push({ "specs.bhk": { $in: bhk.map((item) => Number(item) || item) } });
  const amenities = csv(query.amenities);
  if (amenities.length) filter.amenities = { $all: amenities };
  const facing = csv(query.facing);
  if (facing.length) filter["specs.facing"] = regexAny(facing);
  const furnishing = csv(query.furnishing);
  if (furnishing.length) filter["specs.furnishing"] = regexAny(furnishing);
  const propertyAge = csv(query.propertyAge);
  if (propertyAge.length) filter["specs.age"] = regexAny(propertyAge);
  const possession = csv(query.possession || query.constructionStatus);
  if (possession.length) {
    and.push({
      $or: [
        { "specs.possession": regexAny(possession) },
        { "specs.constructionStatus": regexAny(possession) }
      ]
    });
  }
  if (query.search) {
    const derived = searchDerivedFilters(query.search);
    if (derived.length) and.push({ $or: derived });
    else filter.$text = { $search: query.search };
  }
  if (and.length) filter.$and = and;
  return { ...filter, ...forcedFilter };
};

export const repository = {
  ...baseRepository,
  async list(query = {}, forcedFilter = {}) {
    const { page, limit, skip } = getPagination(query);
    const filter = buildFilter(query, forcedFilter);
    const useTextScore = Boolean(filter.$text && query.sort === "relevance");
    const sort = useTextScore
      ? { score: { $meta: "textScore" }, createdAt: -1 }
      : query.sort === "oldest"
        ? { createdAt: 1 }
        : query.sort === "price_asc"
          ? { price: 1 }
          : query.sort === "price_desc"
            ? { price: -1 }
            : { createdAt: -1 };
    const findQuery = useTextScore
      ? Property.find(filter, { score: { $meta: "textScore" } })
      : Property.find(filter);
    const [data, total] = await Promise.all([
      findQuery.sort(sort).skip(skip).limit(limit),
      Property.countDocuments(filter)
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  }
};