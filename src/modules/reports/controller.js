import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok, created } from "../../shared/response.js";
import { service } from "./service.js";

export const controller = {
  overview: asyncHandler(async (req, res) => ok(res, await service.overview())),
  summary: asyncHandler(async (req, res) => ok(res, await service.summary(req.query))),
  exportRequest: asyncHandler(async (req, res) => created(res, await service.exportRequest(req.body?.filters || {})))
};
