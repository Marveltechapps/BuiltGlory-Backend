import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok } from "../../shared/response.js";
import { service } from "./service.js";

export const controller = {
  getPublicConfig: asyncHandler(async (req, res) => {
    ok(res, await service.getPublicConfig());
  })
};
