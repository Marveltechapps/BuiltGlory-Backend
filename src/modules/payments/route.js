import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/auth.js";
import { createValidator, listValidator } from "./validator.js";
const router = Router();
router.post("/payments/token", authenticate("customer"), validate(createValidator), controller.create);
router.post("/payments/webhook", controller.action(async (req, res) => {
  const data = await import("./service.js").then((m) => m.service.handleWebhook({ rawBody: req.body, signature: req.headers["x-razorpay-signature"], req }));
  res.json({ data, meta: { requestId: res.locals.requestId } });
}));
router.get("/me/payments", authenticate("customer"), validate(listValidator), controller.mine);
export default router;