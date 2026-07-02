import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok, created } from "../../shared/response.js";
import { service } from "./service.js";

export const controller = {
  overview: asyncHandler(async (req, res) => ok(res, await service.overview())),
  loginStats: asyncHandler(async (req, res) => ok(res, await service.loginStats())),
  summary: asyncHandler(async (req, res) => ok(res, await service.summary(req.query))),
  salesAnalytics: asyncHandler(async (req, res) => ok(res, await service.salesAnalytics(req.query))),
  acquisitionAnalytics: asyncHandler(async (req, res) => ok(res, await service.acquisitionAnalytics(req.query))),
  revenueAnalytics: asyncHandler(async (req, res) => ok(res, await service.revenueAnalytics(req.query))),
  exportRequest: asyncHandler(async (req, res) => created(res, await service.exportRequest(req.body?.filters || {}, req.actor))),
  createSchedule: asyncHandler(async (req, res) => created(res, await service.createSchedule(req.body, req.actor))),
  listSchedules: asyncHandler(async (req, res) => {
    const result = await service.listSchedules(req.query);
    ok(res, result.data, result.meta);
  }),
  listExports: asyncHandler(async (req, res) => {
    const result = await service.listExports(req.query);
    ok(res, result.data, result.meta);
  }),
  getExport: asyncHandler(async (req, res) => ok(res, await service.getExport(req.params.id))),
  getExportDownloadUrl: asyncHandler(async (req, res) => ok(res, await service.getDownloadUrl(req.params.id))),
  downloadExport: asyncHandler(async (req, res) => {
    const file = await service.downloadExport(req.params.id, req.query.token);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName.replace(/"/g, "")}"`);
    res.status(200).send(file.buffer);
  })
};
