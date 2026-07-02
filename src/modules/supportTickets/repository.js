import mongoose from "mongoose";
import { SupportTicket } from "./model.js";
import { createRepository } from "../../shared/repositoryFactory.js";
import { notFound } from "../../shared/errors/AppError.js";

const baseRepository = createRepository(SupportTicket);

const idFilter = (id) => {
  if (mongoose.isValidObjectId(id)) return { _id: id, isDeleted: { $ne: true } };
  return { referenceId: id, isDeleted: { $ne: true } };
};

export const repository = {
  ...baseRepository,
  async findById(id, projection, options = {}) {
    const doc = await SupportTicket.findOne(idFilter(id), projection, options);
    if (!doc) throw notFound("SupportTicket not found.");
    return doc;
  },
  async update(id, patch, options = {}) {
    const doc = await SupportTicket.findOneAndUpdate(idFilter(id), patch, { new: true, runValidators: true, ...options });
    if (!doc) throw notFound("SupportTicket not found.");
    return doc;
  }
};