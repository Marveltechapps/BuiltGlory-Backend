import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
export const service = createService({ collection: "properties", repository, workflowField: "status", workflowMap: "propertyStatus", ownerField: null });