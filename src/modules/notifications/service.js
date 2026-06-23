import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
export const service = createService({ collection: "notifications", repository, workflowField: null, workflowMap: null, ownerField: "userId" });