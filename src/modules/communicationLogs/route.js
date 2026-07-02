import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { created, ok } from "../../shared/response.js";
import { service } from "./service.js";
import { createForEntityValidator, createValidator, listValidator, pushValidator, timelineValidator } from "./validator.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

router.get("/admin/workflow/:entityType/:entityId/logs", authenticate("admin"), validate(timelineValidator), asyncHandler(async (req, res) => {
  const result = await service.timeline({ entityType: req.params.entityType, entityId: req.params.entityId, query: req.query }, req.actor);
  ok(res, result.data, result.meta);
}));

router.get("/admin/:entityType/:entityId/timeline", authenticate("admin"), validate(timelineValidator), asyncHandler(async (req, res) => {
  const result = await service.timeline({ entityType: req.params.entityType, entityId: req.params.entityId, query: req.query }, req.actor);
  ok(res, result.data, result.meta);
}));

router.get("/admin/communication-logs", authenticate("admin"), validate(listValidator), asyncHandler(async (req, res) => {
  const result = await service.list(req.query, req.actor);
  ok(res, result.data, result.meta);
}));

router.post("/admin/communication-logs", authenticate("admin"), validate(createValidator), asyncHandler(async (req, res) => {
  created(res, await service.create(req.body, req.actor, req));
}));

router.post("/admin/workflow/:entityType/:entityId/logs", authenticate("admin"), validate(createForEntityValidator), asyncHandler(async (req, res) => {
  const data = await service.createForEntity({ entityType: req.params.entityType, entityId: req.params.entityId, body: req.body }, req.actor, req);
  created(res, data);
}));

router.post("/admin/workflow/:entityType/:entityId/push", authenticate("admin"), validate(pushValidator), asyncHandler(async (req, res) => {
  const data = await service.sendPush({ entityType: req.params.entityType, entityId: req.params.entityId, body: req.body }, req.actor, req);
  created(res, data);
}));

router.post("/admin/workflow/:entityType/:entityId/proofs", authenticate("admin"), upload.single("file"), asyncHandler(async (req, res) => {
  const data = await service.createProofUpload({ entityType: req.params.entityType, entityId: req.params.entityId, file: req.file, body: req.body }, req.actor, req);
  created(res, data);
}));

router.delete("/admin/workflow/logs/:logId", authenticate("admin"), asyncHandler(async (req, res) => {
  ok(res, await service.remove(req.params.logId, req.actor, req));
}));

export default router;
