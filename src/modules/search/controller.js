import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok } from "../../shared/response.js";
import { service } from "./service.js";

export const controller = {
  search: asyncHandler(async (req, res) => ok(res, await service.search(req.query, req.actor)))
};
