import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok } from "../../shared/response.js";
import { service } from "./service.js";

export const controller = {
  get: asyncHandler(async (req, res) => {
    ok(res, await service.get());
  }),
  update: asyncHandler(async (req, res) => {
    ok(res, await service.update(req.body, req.actor, req));
  })
};
