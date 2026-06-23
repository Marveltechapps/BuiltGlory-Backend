import { asyncHandler } from "./asyncHandler.js";
import { ok, created, noContent } from "./response.js";
export const createController = (service) => ({
  list: asyncHandler(async (req, res) => { const result = await service.list(req.query, req.actor); ok(res, result.data, result.meta); }),
  mine: asyncHandler(async (req, res) => { const result = await service.list(req.query, req.actor); ok(res, result.data, result.meta); }),
  get: asyncHandler(async (req, res) => ok(res, await service.get(req.params.id || req.params.propertyId || req.params.userId || req.params.enquiryId || req.params.sellRequestId || req.params.acquisitionId || req.params.dealId || req.params.visitId || req.params.callbackId || req.params.threadId || req.params.leadId || req.params.ticketId, req.actor))),
  create: asyncHandler(async (req, res) => created(res, await service.create(req.body, req.actor))),
  update: asyncHandler(async (req, res) => ok(res, await service.update(req.params.id || req.params.propertyId || req.params.userId || req.params.enquiryId || req.params.sellRequestId || req.params.acquisitionId || req.params.dealId || req.params.visitId || req.params.callbackId || req.params.threadId || req.params.leadId || req.params.ticketId, req.body, req.actor, req))),
  remove: asyncHandler(async (req, res) => { await service.remove(req.params.id, req.actor, req); noContent(res); }),
  transition: (field) => asyncHandler(async (req, res) => ok(res, await service.transition(req.params.id || req.params.propertyId || req.params.enquiryId || req.params.sellRequestId || req.params.acquisitionId || req.params.dealId || req.params.visitId || req.params.callbackId || req.params.leadId || req.params.ticketId, req.body[field] || req.body.status || req.body.stage || req.body.decision, req.actor, req, req.body))),
  action: (handler) => asyncHandler(handler)
});