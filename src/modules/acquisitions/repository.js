import { Acquisition } from "./model.js";
import { createRepository } from "../../shared/repositoryFactory.js";
const baseRepository = createRepository(Acquisition);
export const repository = {
  ...baseRepository,
  async list(query = {}, forcedFilter = {}) {
    const result = await baseRepository.list(query, forcedFilter);
    if (result.data.length) {
      await Acquisition.populate(result.data, { path: "assignedTo", select: "name email" });
    }
    return result;
  }
};