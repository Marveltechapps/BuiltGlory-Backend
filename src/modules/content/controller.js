import { asyncHandler } from "../../shared/asyncHandler.js";
import { ok, created, noContent } from "../../shared/response.js";
import { service } from "./service.js";

export const controller = {
  listPublic: asyncHandler(async (req, res) => {
    ok(res, await service.listPublic(req.query));
  }),
  getPublic: asyncHandler(async (req, res) => {
    ok(res, await service.getPublic(req.params.slug));
  }),
  list: asyncHandler(async (req, res) => {
    const result = await service.list(req.query);
    ok(res, result.data, result.meta);
  }),
  create: asyncHandler(async (req, res) => {
    created(res, await service.create(req.body, req.actor, req));
  }),
  update: asyncHandler(async (req, res) => {
    ok(res, await service.update(req.params.contentId, req.body, req.actor, req));
  }),
  remove: asyncHandler(async (req, res) => {
    await service.remove(req.params.contentId, req.actor, req);
    noContent(res);
  }),
  reorder: asyncHandler(async (req, res) => {
    ok(res, await service.reorder(req.body.items, req.actor, req));
  })
};
