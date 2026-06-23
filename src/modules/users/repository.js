import { User } from "./model.js";
import { createRepository } from "../../shared/repositoryFactory.js";
export const repository = createRepository(User);