import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { resolvePropertyType } from "./propertyTypeUtils.js";

const baseService = createService({
  collection: "properties",
  repository,
  workflowField: "status",
  workflowMap: "propertyStatus",
  ownerField: null
});

const withResolvedType = (data = {}) => {
  const payload = { ...data };
  if (payload.type || payload.specs) {
    payload.type = resolvePropertyType({ type: payload.type, specs: payload.specs });
  }
  return payload;
};

export const service = {
  ...baseService,
  async create(data, actor) {
    return baseService.create(withResolvedType(data), actor);
  },
  async update(id, data, actor, req) {
    return baseService.update(id, withResolvedType(data), actor, req);
  }
};
