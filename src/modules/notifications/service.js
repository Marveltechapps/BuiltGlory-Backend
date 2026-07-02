import { createService } from "../../shared/serviceFactory.js";
import { notFound } from "../../shared/errors/AppError.js";
import { Notification } from "./model.js";
import { repository } from "./repository.js";
const baseService = createService({ collection: "notifications", repository, workflowField: null, workflowMap: null, ownerField: "userId" });

export const service = {
  ...baseService,
  async update(id, data, actor, req) {
    const patch = { ...data };
    if (patch.isRead === true && !patch.readAt) patch.readAt = new Date();
    if (patch.isRead === false) patch.readAt = null;
    return baseService.update(id, patch, actor, req);
  },
  async markMineRead(actor, ids = []) {
    const filter = { userId: actor?.id };
    if (ids.length) filter._id = { $in: ids };
    await Notification.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
    const result = await baseService.list({ limit: 100 }, actor);
    return result.data;
  },
  async markOneRead(id, actor) {
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: actor?.id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!updated) throw notFound("Notification not found.");
    return updated;
  }
};