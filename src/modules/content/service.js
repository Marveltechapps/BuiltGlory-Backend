import { makeReferenceId } from "../../shared/id.js";
import { writeAuditLog } from "../../services/audit.service.js";
import { conflict, notFound } from "../../shared/errors/AppError.js";
import { DEFAULT_CONTENT_ITEMS } from "./defaults.js";
import { ContentItem } from "./model.js";
import { repository } from "./repository.js";

const publicFields = "-createdBy -updatedBy -isDeleted -deletedAt -deletedBy";
const managedSort = (query = {}) => query.sort === "oldest" ? { createdAt: 1 } : { section: 1, order: 1, createdAt: -1 };

const normalizeSlug = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const duplicateContentError = (error) => {
  if (error?.code !== 11000) return null;
  const fields = Object.keys(error.keyPattern || error.keyValue || {});
  if (fields.includes("slug")) return conflict("Content slug already exists.");
  if (fields.includes("referenceId")) return conflict("Content reference already exists.");
  return conflict("Content already exists.");
};

const withManagedFields = (data, actor, existing) => {
  const status = data.status || existing?.status || "published";
  return {
    ...data,
    slug: normalizeSlug(data.slug || existing?.slug || data.title),
    status,
    publishedAt: status === "published" ? data.publishedAt || existing?.publishedAt || new Date() : data.publishedAt || null,
    updatedBy: actor?.id || existing?.updatedBy,
    createdBy: existing?.createdBy || actor?.id
  };
};

const ensureDefaults = async () => {
  const count = await ContentItem.countDocuments({ isDeleted: { $ne: true } });
  if (count > 0) return;
  await ContentItem.insertMany(DEFAULT_CONTENT_ITEMS.map((item, index) => ({
    ...item,
    referenceId: makeReferenceId("content"),
    status: item.status || "published",
    order: item.order ?? index,
    publishedAt: item.publishedAt || new Date()
  })), { ordered: false });
};

export const service = {
  async listPublic(query = {}) {
    await ensureDefaults();
    const filter = { status: "published", isDeleted: { $ne: true } };
    if (query.section) filter.section = query.section;
    if (query.category) filter.category = query.category;
    if (query.search) filter.$text = { $search: query.search };
    return ContentItem.find(filter).select(publicFields).sort({ order: 1, publishedAt: -1, createdAt: -1 }).limit(Number(query.limit) || 100);
  },

  async getPublic(slug) {
    await ensureDefaults();
    const doc = await ContentItem.findOne({ slug: normalizeSlug(slug), status: "published", isDeleted: { $ne: true } }).select(publicFields);
    if (!doc) throw notFound("Content not found.");
    return doc;
  },

  async list(query = {}) {
    await ensureDefaults();
    return repository.list(query, {});
  },

  async create(data, actor, req) {
    const payload = {
      ...withManagedFields(data, actor),
      referenceId: data.referenceId || makeReferenceId("content")
    };
    let doc;
    try {
      doc = await repository.create(payload);
    } catch (error) {
      throw duplicateContentError(error) || error;
    }
    await writeAuditLog({ actor, action: "content.created", resourceType: "content", resourceId: doc._id, after: doc.toObject(), req });
    return doc;
  },

  async update(id, data, actor, req) {
    const before = await repository.findById(id);
    let doc;
    try {
      doc = await repository.update(id, withManagedFields(data, actor, before));
    } catch (error) {
      throw duplicateContentError(error) || error;
    }
    await writeAuditLog({ actor, action: "content.updated", resourceType: "content", resourceId: id, before: before.toObject(), after: doc.toObject(), req });
    return doc;
  },

  async remove(id, actor, req) {
    const before = await repository.findById(id);
    const doc = await repository.softDelete(id, actor?.id);
    await writeAuditLog({ actor, action: "content.deleted", resourceType: "content", resourceId: id, before: before.toObject(), after: doc.toObject(), req });
    return doc;
  },

  async reorder(items, actor, req) {
    const updates = [];
    for (const item of items || []) {
      updates.push(ContentItem.findOneAndUpdate({ _id: item.id, isDeleted: { $ne: true } }, { order: item.order, updatedBy: actor?.id }, { new: true, runValidators: true }));
    }
    const data = (await Promise.all(updates)).filter(Boolean).sort((a, b) => a.order - b.order);
    await writeAuditLog({ actor, action: "content.reordered", resourceType: "content", resourceId: "bulk", after: { count: data.length }, req });
    return data;
  },

  managedSort
};
