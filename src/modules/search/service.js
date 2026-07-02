import { Property } from "../properties/model.js";
import { User } from "../users/model.js";
import { BuyEnquiry } from "../buyEnquiries/model.js";
import { SellRequest } from "../sellRequests/model.js";
import { Acquisition } from "../acquisitions/model.js";
import { SalesDeal } from "../salesDeals/model.js";
import { SearchHistory } from "./searchHistoryModel.js";

const clean = { isDeleted: { $ne: true } };
const appVisiblePropertyFilter = {
  ...clean,
  isVisibleOnApp: true,
  status: { $in: ["available", "reserved", "under_construction"] }
};
const MAX_RECENT_SEARCHES = 10;

const hasPermission = (actor, permission) =>
  actor?.role === "super_admin" || actor?.permissions?.includes(permission);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const asId = (doc) => String(doc?._id || doc?.id || "");

const compact = (items) => items.filter(Boolean);
const cleanTerm = (value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
const normalizedTerm = (value) => cleanTerm(value).toLowerCase();

const searchFields = (fields, regex) => ({
  $or: fields.map((field) => ({ [field]: regex }))
});

const propertyResult = (item) => ({
  type: "property",
  id: asId(item),
  title: item.title || item.referenceId || "Property",
  subtitle: compact([item.address?.locality || item.address?.city, item.referenceId, item.status]).join(" • "),
  route: `/admin/properties/${asId(item)}`,
  emoji: "property"
});

const userResult = (item) => ({
  type: "user",
  id: asId(item),
  title: item.name || item.phone || item.email || "User",
  subtitle: compact([item.mobileNumber || item.phone || item.phoneNormalized, item.role, item.kycStatus]).join(" • "),
  route: `/admin/users/${asId(item)}`,
  emoji: "user"
});

const buyEnquiryResult = (item) => ({
  type: "enquiry",
  id: asId(item),
  title: `${item.buyerSnapshot?.name || "Buyer"} -> ${item.propertySnapshot?.title || "Property"}`,
  subtitle: compact([item.referenceId, "Buy enquiry", item.status]).join(" • "),
  route: `/admin/enquiries/buy/${asId(item)}`,
  emoji: "enquiry"
});

const sellRequestResult = (item) => ({
  type: "enquiry",
  id: asId(item),
  title: `${item.sellerSnapshot?.name || "Seller"} -> ${item.propertyTitle || "Property"}`,
  subtitle: compact([item.referenceId, "Sell request", item.status]).join(" • "),
  route: `/admin/enquiries/sell/${asId(item)}`,
  emoji: "enquiry"
});

const acquisitionResult = (item) => ({
  type: "acquisition",
  id: asId(item),
  title: item.propertyTitle || item.referenceId || "Acquisition",
  subtitle: compact([item.referenceId, item.sellerSnapshot?.name, item.stage]).join(" • "),
  route: `/admin/acquisition/${asId(item)}`,
  emoji: "acquisition"
});

const dealResult = (item) => ({
  type: "deal",
  id: asId(item),
  title: `${item.buyerSnapshot?.name || "Buyer"} -> ${item.propertySnapshot?.title || "Property"}`,
  subtitle: compact([item.referenceId, item.stage, item.priority]).join(" • "),
  route: `/admin/sales/${asId(item)}`,
  emoji: "deal"
});

export const service = {
  async listRecentSearches(actor) {
    const items = await SearchHistory.find({ userId: actor.id })
      .sort({ updatedAt: -1 })
      .limit(MAX_RECENT_SEARCHES)
      .lean();
    return items.map((item) => item.term);
  },

  async recordRecentSearch(actor, body = {}) {
    const term = cleanTerm(body.term);
    const normalized = normalizedTerm(term);
    if (normalized.length < 2) return this.listRecentSearches(actor);

    await SearchHistory.findOneAndUpdate(
      { userId: actor.id, normalizedTerm: normalized },
      {
        $set: {
          term,
          resultCount: Math.max(0, Number(body.resultCount) || 0),
          source: "customer_app",
          updatedAt: new Date()
        },
        $setOnInsert: { userId: actor.id, normalizedTerm: normalized }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const overflow = await SearchHistory.find({ userId: actor.id })
      .sort({ updatedAt: -1 })
      .skip(MAX_RECENT_SEARCHES)
      .select("_id")
      .lean();
    if (overflow.length) await SearchHistory.deleteMany({ _id: { $in: overflow.map((item) => item._id) } });

    return this.listRecentSearches(actor);
  },

  async clearRecentSearches(actor) {
    await SearchHistory.deleteMany({ userId: actor.id });
    return [];
  },

  async trendingSearches(query = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 20);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const historyTerms = await SearchHistory.aggregate([
      { $match: { updatedAt: { $gte: since } } },
      { $group: { _id: "$normalizedTerm", term: { $last: "$term" }, score: { $sum: 1 }, lastSearchedAt: { $max: "$updatedAt" } } },
      { $sort: { score: -1, lastSearchedAt: -1 } },
      { $limit: limit }
    ]);

    const seen = new Set();
    const terms = historyTerms
      .map((item) => cleanTerm(item.term || item._id))
      .filter((term) => {
        const key = normalizedTerm(term);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (terms.length >= limit) return terms.slice(0, limit);

    const propertyTerms = await Property.aggregate([
      { $match: appVisiblePropertyFilter },
      {
        $project: {
          candidates: [
            "$address.locality",
            "$address.city",
            "$type",
            "$specs.bhk"
          ],
          weight: { $add: [{ $ifNull: ["$metrics.views", 0] }, { $multiply: [{ $ifNull: ["$metrics.enquiries", 0] }, 3] }, 1] }
        }
      },
      { $unwind: "$candidates" },
      { $match: { candidates: { $nin: [null, ""] } } },
      { $group: { _id: "$candidates", score: { $sum: "$weight" } } },
      { $sort: { score: -1 } },
      { $limit: limit * 3 }
    ]);

    for (const item of propertyTerms) {
      const value = cleanTerm(String(item._id).replace(/_/g, " "));
      const key = normalizedTerm(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      terms.push(value);
      if (terms.length >= limit) break;
    }

    return terms;
  },

  async search(query, actor) {
    const limit = Math.min(Number(query.limit) || 12, 20);
    const perModuleLimit = Math.max(3, Math.ceil(limit / 3));
    const regex = new RegExp(escapeRegex(query.q), "i");
    const tasks = [];

    if (hasPermission(actor, "properties.read")) {
      tasks.push(
        Property.find({ ...clean, ...searchFields(["title", "referenceId", "address.locality", "address.city"], regex) })
          .sort({ updatedAt: -1 })
          .limit(perModuleLimit)
          .lean()
          .then((items) => items.map(propertyResult))
      );
    }

    if (hasPermission(actor, "users.read")) {
      tasks.push(
        User.find({ ...clean, ...searchFields(["name", "referenceId", "phone", "mobileNumber", "email"], regex) })
          .sort({ registeredAt: -1, createdAt: -1 })
          .limit(perModuleLimit)
          .lean()
          .then((items) => items.map(userResult))
      );
    }

    if (hasPermission(actor, "enquiries.read")) {
      tasks.push(
        BuyEnquiry.find({ ...clean, ...searchFields(["referenceId", "buyerSnapshot.name", "buyerSnapshot.phone", "propertySnapshot.title"], regex) })
          .sort({ submittedAt: -1, createdAt: -1 })
          .limit(perModuleLimit)
          .lean()
          .then((items) => items.map(buyEnquiryResult))
      );
      tasks.push(
        SellRequest.find({ ...clean, ...searchFields(["referenceId", "sellerSnapshot.name", "sellerSnapshot.phone", "propertyTitle"], regex) })
          .sort({ submittedAt: -1, createdAt: -1 })
          .limit(perModuleLimit)
          .lean()
          .then((items) => items.map(sellRequestResult))
      );
    }

    if (hasPermission(actor, "acquisitions.read")) {
      tasks.push(
        Acquisition.find({ ...clean, ...searchFields(["referenceId", "propertyTitle", "sellerSnapshot.name", "propertyCity"], regex) })
          .sort({ updatedAt: -1 })
          .limit(perModuleLimit)
          .lean()
          .then((items) => items.map(acquisitionResult))
      );
    }

    if (hasPermission(actor, "sales.read")) {
      tasks.push(
        SalesDeal.find({ ...clean, ...searchFields(["referenceId", "buyerSnapshot.name", "buyerSnapshot.phone", "propertySnapshot.title"], regex) })
          .sort({ updatedAt: -1 })
          .limit(perModuleLimit)
          .lean()
          .then((items) => items.map(dealResult))
      );
    }

    const groups = await Promise.all(tasks);
    return groups.flat().slice(0, limit);
  }
};
