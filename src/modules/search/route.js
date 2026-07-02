import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { created, ok } from "../../shared/response.js";
import { controller } from "./controller.js";
import { service } from "./service.js";
import { searchValidator } from "./validator.js";

const router = Router();

router.get("/search/trending", asyncHandler(async (req, res) => ok(res, await service.trendingSearches(req.query))));

router.get("/me/searches", authenticate("customer"), asyncHandler(async (req, res) => ok(res, await service.listRecentSearches(req.actor))));

router.post("/me/searches", authenticate("customer"), asyncHandler(async (req, res) => created(res, await service.recordRecentSearch(req.actor, req.body))));

router.delete("/me/searches", authenticate("customer"), asyncHandler(async (req, res) => ok(res, await service.clearRecentSearches(req.actor))));

router.get("/admin/search", authenticate("admin"), validate(searchValidator), controller.search);

export default router;
