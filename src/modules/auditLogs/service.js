import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
export const service = createService({ collection: "auditLogs", repository, workflowField: null, workflowMap: null, ownerField: null });