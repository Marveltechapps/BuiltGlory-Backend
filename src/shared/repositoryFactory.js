import { getPagination, paginationMeta } from "./pagination.js";
import { notFound } from "./errors/AppError.js";
export const createRepository = (Model) => ({
  Model,
  async create(data, options = {}) { return Model.create([data], options).then((r) => r[0]); },
  async findById(id, projection, options = {}) { const doc = await Model.findOne({ _id: id, isDeleted: { $ne: true } }, projection, options); if (!doc) throw notFound(`${Model.modelName} not found.`); return doc; },
  async findOne(filter = {}) { return Model.findOne({ ...filter, isDeleted: { $ne: true } }); },
  async list(query = {}, forcedFilter = {}) {
    const { page, limit, skip } = getPagination(query);
    const filter = { isDeleted: { $ne: true } };
    for (const [k, v] of Object.entries(query)) {
      if (["page", "limit", "sort", "search"].includes(k) || v === undefined || v === "") continue;
      if (Object.prototype.hasOwnProperty.call(forcedFilter, k)) continue;
      filter[k] = Array.isArray(v) ? { $in: v } : v;
    }
    Object.assign(filter, forcedFilter);
    if (query.search) filter.$text = { $search: query.search };
    const sort = query.sort === "oldest" ? { createdAt: 1 } : query.sort === "price_asc" ? { price: 1 } : query.sort === "price_desc" ? { price: -1 } : { createdAt: -1 };
    const [data, total] = await Promise.all([Model.find(filter).sort(sort).skip(skip).limit(limit), Model.countDocuments(filter)]);
    return { data, meta: paginationMeta(page, limit, total) };
  },
  async update(id, patch, options = {}) { const doc = await Model.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, patch, { new: true, runValidators: true, ...options }); if (!doc) throw notFound(`${Model.modelName} not found.`); return doc; },
  async softDelete(id, actorId) { return this.update(id, { isDeleted: true, deletedAt: new Date(), deletedBy: actorId }); }
});