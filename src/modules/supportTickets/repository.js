import mongoose from "mongoose";
import { SupportTicket } from "./model.js";
import { createRepository } from "../../shared/repositoryFactory.js";
import { notFound } from "../../shared/errors/AppError.js";

const baseRepository = createRepository(SupportTicket);

const ticketPopulate = [
  { path: "userId", select: "name phone mobileNumber phoneNormalized email userType role referenceId" },
  { path: "assignedTo", select: "name email role" },
  { path: "escalation.targetAssignee", select: "name email role" },
  { path: "responses.responderId", select: "name email role" },
];

const idFilter = (id) => {
  if (mongoose.isValidObjectId(id)) return { _id: id, isDeleted: { $ne: true } };
  return { referenceId: id, isDeleted: { $ne: true } };
};

const populateTicketQuery = (query) => query.populate(ticketPopulate);

export const repository = {
  ...baseRepository,
  async findById(id, projection, options = {}) {
    const doc = await populateTicketQuery(SupportTicket.findOne(idFilter(id), projection, options));
    if (!doc) throw notFound("SupportTicket not found.");
    return doc;
  },
  async list(query = {}, forcedFilter = {}) {
    const result = await baseRepository.list(query, forcedFilter);
    await SupportTicket.populate(result.data, ticketPopulate);
    return result;
  },
  async update(id, patch, options = {}) {
    const doc = await populateTicketQuery(
      SupportTicket.findOneAndUpdate(idFilter(id), patch, { new: true, runValidators: true, ...options }),
    );
    if (!doc) throw notFound("SupportTicket not found.");
    return doc;
  }
};