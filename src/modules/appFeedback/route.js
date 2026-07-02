import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { createValidator, listValidator, updateValidator } from "./validator.js";

const router = Router();

router.post("/feedback", authenticate("customer"), validate(createValidator), controller.create);
router.get("/me/feedback", authenticate("customer"), validate(listValidator), controller.mine);
router.get("/admin/feedback", authenticate("admin"), requirePermission("support.read"), validate(listValidator), controller.list);
router.patch("/admin/feedback/:id", authenticate("admin"), requirePermission("support.write"), validate(updateValidator), controller.update);

export default router;
