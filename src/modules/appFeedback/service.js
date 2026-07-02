import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";

const baseService = createService({
  collection: "appFeedback",
  repository,
  ownerField: "userId",
});

export const service = {
  ...baseService,
  async create(data, actor) {
    return baseService.create(
      {
        ...data,
        userId: actor?.id,
        status: "new",
      },
      actor,
    );
  },
};
