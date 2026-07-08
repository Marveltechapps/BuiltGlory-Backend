import { PROPERTY_TYPES } from "../../constants/enums.js";

const TYPE_ALIASES = {
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

const PLOT_SIGNAL_KEYS = [
  "plotArea",
  "layoutName",
  "plotNumber",
  "plotDimension",
  "totalPlotsInLayout",
  "roadWidth",
  "approvalType",
  "cornerPlot",
  "titleType",
  "boundaryMarked",
  "pattaAvailable"
];

const hasPlotSignals = (specs = {}) =>
  PLOT_SIGNAL_KEYS.some((key) => {
    const value = specs?.[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });

export const normalizePropertyType = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[\s-]+/g, "_");
  if (PROPERTY_TYPES.includes(normalized)) return normalized;
  return TYPE_ALIASES[normalized] || "";
};

export const resolvePropertyType = ({ type, specs = {} }) => {
  if (hasPlotSignals(specs)) return "plot";
  const normalized = normalizePropertyType(type);
  return normalized || type;
};
