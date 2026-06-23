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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();
const requiredBulkFields = ["title", "type", "city", "locality", "pincode", "price"];
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
  rows.forEach((row, index) => {
    requiredBulkFields.forEach((field) => {
      if (row[field] === undefined || row[field] === "") errors.push({ row: index + 2, field, message: "Required field is missing." });
    });
    if (row.pincode && !/^\d{6}$/.test(String(row.pincode))) errors.push({ row: index + 2, field: "pincode", message: "Pincode must contain 6 digits." });
    if (row.price !== "" && !(Number(row.price) > 0)) errors.push({ row: index + 2, field: "price", message: "Price must be positive." });
  });
  return errors;
};
const mapPropertyQuery = (query) => {
  const mapped = { ...query };
  if (query.city) { mapped["address.city"] = query.city; delete mapped.city; }
  if (query.locality) { mapped["address.locality"] = query.locality; delete mapped.locality; }
  if (query.featured !== undefined) { mapped.isFeatured = query.featured; delete mapped.featured; }
  if (query.upcoming !== undefined) { mapped.isUpcoming = query.upcoming; delete mapped.upcoming; }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    mapped.price = {};
    if (query.minPrice !== undefined) mapped.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) mapped.price.$lte = query.maxPrice;
    delete mapped.minPrice;
    delete mapped.maxPrice;
  }
  if (query.minArea !== undefined || query.maxArea !== undefined) {
    mapped["specs.builtUpArea"] = {};
    if (query.minArea !== undefined) mapped["specs.builtUpArea"].$gte = query.minArea;
    if (query.maxArea !== undefined) mapped["specs.builtUpArea"].$lte = query.maxArea;
    delete mapped.minArea;
    delete mapped.maxArea;
  }
  if (query.bhk) { mapped["specs.bhk"] = query.bhk; delete mapped.bhk; }
  if (query.verified !== undefined) delete mapped.verified;
  return mapped;
};
router.get("/properties", validate(listValidator), controller.action(async (req, res) => { req.query.status = req.query.status || ["available", "reserved", "under_construction"]; const result = await service.list(mapPropertyQuery(req.query), req.actor); res.json({ data: result.data, meta: { ...result.meta, requestId: res.locals.requestId } }); }));
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
router.get("/admin/properties/:propertyId", authenticate("admin"), requirePermission("properties.read"), controller.get);
router.patch("/admin/properties/:propertyId", authenticate("admin"), requirePermission("properties.write"), validate(updateValidator), controller.action(async (req, res, next) => {
  if ((req.body.isFeatured !== undefined || req.body.isUpcoming !== undefined) && req.actor.role !== "super_admin" && !req.actor.permissions?.includes("properties.publish")) return next(forbidden("Publishing and editorial flags require properties.publish."));
  const data = await service.update(req.params.propertyId, req.body, req.actor, req);
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
  res.status(201).json({ data: { valid: errors.length === 0, rowsAccepted: rows.length - rejectedRows.size, rowsRejected: rejectedRows.size, errors }, meta: { requestId: res.locals.requestId } });
}));
export default router;