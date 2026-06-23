import { createController } from "../../shared/controllerFactory.js";
import { service } from "./service.js";
export const controller = createController(service);