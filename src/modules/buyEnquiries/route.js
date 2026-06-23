import { Router } from "express";
import { controller } from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { listValidator, createValidator, updateValidator } from "./validator.js";
const router = Router();
router.post("/buy-enquiries", authenticate("customer"), validate(createValidator), controller.create);
router.get("/me/buy-enquiries", authenticate("customer"), validate(listValidator), controller.mine);
router.get("/me/buy-enquiries/:enquiryId", authenticate("customer"), controller.get);
router.patch("/me/buy-enquiries/:enquiryId/cancel", authenticate("customer"), controller.action(async (req, res) => { const data = await import("./service.js").then((m) => m.service.cancel(req.params.enquiryId, req.actor, req)); res.json({ data, meta: { requestId: res.locals.requestId } }); }));
router.get("/admin/buy-enquiries", authenticate("admin"), requirePermission("enquiries.read"), validate(listValidator), controller.list);
router.get("/admin/buy-enquiries/:enquiryId", authenticate("admin"), requirePermission("enquiries.read"), controller.get);
router.patch("/admin/buy-enquiries/:enquiryId", authenticate("admin"), requirePermission("enquiries.write"), validate(updateValidator), controller.update);
router.post("/admin/buy-enquiries/:enquiryId/convert-to-deal", authenticate("admin"), requirePermission("sales.write"), controller.action(async (req, res) => {
  const { BuyEnquiry } = await import("./model.js");
  const { service: dealService } = await import("../salesDeals/service.js");
  const enquiry = await BuyEnquiry.findOne({ _id: req.params.enquiryId, status: { $ne: "closed" }, isDeleted: { $ne: true } });
  if (!enquiry) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Buy enquiry not found.", details: [] }, meta: { requestId: res.locals.requestId } });
  const data = await dealService.create({
    ...req.body,
    buyerId: enquiry.buyerId,
    buyerSnapshot: enquiry.buyerSnapshot,
    propertyId: enquiry.propertyId,
    propertySnapshot: enquiry.propertySnapshot,
    sourceEnquiryId: enquiry._id,
    stage: "active_leads"
  }, req.actor);
  res.status(201).json({ data, meta: { requestId: res.locals.requestId } });
}));
export default router;