import { Router } from "express";
import multer from "multer";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { createValidator, listValidator } from "./validator.js";
import { uploadLimiter } from "../../middleware/rateLimit.js";
import { service } from "./service.js";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();
router.post("/documents/upload-intents", authenticate(), uploadLimiter, validate(createValidator), controller.action(async (req, res) => {
  const data = await service.create({ ...req.body, createSignedUrl: true }, req.actor);
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
router.post("/documents", authenticate(), uploadLimiter, upload.single("file"), controller.action(async (req, res) => {
  const data = await service.createFromMultipart({ file: req.file, body: req.body }, req.actor);
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/documents/:documentId/read-url", authenticate(), controller.action(async (req, res) => {
  const data = await service.createSecureReadUrl(req.params.documentId, req.actor, req.query);
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/admin/documents", authenticate("admin"), requirePermission("properties.read"), validate(listValidator), controller.list);
export default router;