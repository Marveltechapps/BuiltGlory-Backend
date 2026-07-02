import { createService } from "../../shared/serviceFactory.js";
import { repository } from "./repository.js";
import { Visit } from "./model.js";
import { Property } from "../properties/model.js";
import { User } from "../users/model.js";
import { BuyEnquiry } from "../buyEnquiries/model.js";
import { domainError } from "../../shared/errors/AppError.js";
const baseService = createService({ collection: "visits", repository, workflowField: "status", workflowMap: "visitStatus", ownerField: "buyerId" });
const ACTIVE_SLOT_STATUSES = ["scheduled", "confirmed", "rescheduled"];
const SLOT_CAPACITY = 1;
const DEFAULT_SLOTS = {
  physical: ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"],
  virtual: ["9:00 AM", "10:30 AM", "2:00 PM", "4:30 PM", "6:00 PM"]
};
const dateKey = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || "").slice(0, 10);
};
const dayStart = (value) => new Date(`${dateKey(value)}T00:00:00.000Z`);
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const normalizeSlot = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
const visitDateTime = (data) => {
  const [year, month, day] = dateKey(data.visitDate).split("-").map(Number);
  const match = normalizeSlot(data.visitTime || "00:00").match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  let hour = match ? Number(match[1]) : 0;
  const minute = match?.[2] ? Number(match[2]) : 0;
  const meridiem = match?.[3];
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
};
const ensureSchedulableProperty = async (propertyId, visitType) => {
  const property = await Property.findOne({ _id: propertyId, status: { $in: ["available", "reserved", "under_construction"] }, isDeleted: { $ne: true } });
  if (!property || property.status === "sold") throw domainError("Visit requires a visible unsold property.");
  if (visitType === "physical" && !property.address?.locality) throw domainError("Physical visits require property location.");
  return property;
};
const slotCountMap = async ({ propertyId, visitType, from, to, excludeVisitId }) => {
  const query = {
    propertyId,
    visitType,
    status: { $in: ACTIVE_SLOT_STATUSES },
    isDeleted: { $ne: true },
    visitDate: { $gte: from, $lt: to }
  };
  if (excludeVisitId) query._id = { $ne: excludeVisitId };
  const visits = await Visit.find(query).select("visitDate visitTime").lean();
  return visits.reduce((map, visit) => {
    const key = `${dateKey(visit.visitDate)}|${normalizeSlot(visit.visitTime)}`;
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
};
const assertSlotAvailable = async (data, excludeVisitId) => {
  const from = dayStart(data.visitDate);
  const counts = await slotCountMap({ propertyId: data.propertyId, visitType: data.visitType, from, to: addDays(from, 1), excludeVisitId });
  const booked = counts.get(`${dateKey(data.visitDate)}|${normalizeSlot(data.visitTime)}`) || 0;
  if (booked >= SLOT_CAPACITY) throw domainError("Selected visit slot is no longer available. Please choose another time.");
};
const syncLinkedEnquiryStatus = async (visit, to) => {
  if (!visit.enquiryId) return;
  const targetStatus = to === "completed" ? "negotiating" : ["scheduled", "confirmed", "rescheduled"].includes(to) ? "visit_scheduled" : null;
  if (!targetStatus) return;
  const allowedFrom = targetStatus === "visit_scheduled" ? ["new", "responded"] : ["new", "responded", "visit_scheduled"];
  await BuyEnquiry.findOneAndUpdate(
    { _id: visit.enquiryId, status: { $in: allowedFrom }, isDeleted: { $ne: true } },
    { status: targetStatus }
  );
};
export const service = {
  ...baseService,
  async availability(query) {
    const visitType = query.visitType || "physical";
    await ensureSchedulableProperty(query.propertyId, visitType);
    const from = dayStart(query.from || addDays(dayStart(new Date()), 1));
    const days = Math.min(Math.max(Number(query.days || 7), 1), 30);
    const to = addDays(from, days);
    const slots = DEFAULT_SLOTS[visitType] || DEFAULT_SLOTS.physical;
    const counts = await slotCountMap({ propertyId: query.propertyId, visitType, from, to });
    return {
      propertyId: query.propertyId,
      visitType,
      timezone: "Asia/Kolkata",
      from: dateKey(from),
      to: dateKey(addDays(to, -1)),
      days: Array.from({ length: days }).map((_, index) => {
        const date = dateKey(addDays(from, index));
        return {
          date,
          slots: slots.map((time) => {
            const bookedCount = counts.get(`${date}|${normalizeSlot(time)}`) || 0;
            const remainingCapacity = Math.max(SLOT_CAPACITY - bookedCount, 0);
            return {
              time,
              available: remainingCapacity > 0,
              status: remainingCapacity > 0 ? "available" : "booked",
              remainingCapacity,
              bookedCount
            };
          })
        };
      })
    };
  },
  async create(data, actor) {
    const buyer = await User.findById(actor?.id);
    if (!buyer || buyer.isBlocked) throw domainError("Blocked or inactive customers cannot schedule visits.");
    await ensureSchedulableProperty(data.propertyId, data.visitType);
    if (visitDateTime(data) <= new Date()) throw domainError("Visit date and time must be in the future.");
    await assertSlotAvailable(data);
    const visit = await baseService.create({ ...data, buyerId: buyer._id }, actor);
    await syncLinkedEnquiryStatus(visit, visit.status);
    return visit;
  },
  async transition(id, to, actor, req, extra = {}) {
    const before = await repository.findById(id);
    if (extra.callLog) {
      extra.$push = { ...(extra.$push || {}), callLogs: { ...extra.callLog, calledAt: extra.callLog.calledAt || new Date(), calledBy: actor?.id } };
      delete extra.callLog;
    }
    if (extra.note) {
      extra.$push = { ...(extra.$push || {}), notes: { text: extra.note.text, createdAt: new Date(), createdBy: actor?.id } };
      delete extra.note;
    }
    if (extra.visitNotes) {
      extra.notes = extra.visitNotes.map((note) => ({ text: note.text, createdAt: note.createdAt || new Date(), createdBy: actor?.id }));
      delete extra.visitNotes;
    }
    if (to === "rescheduled") {
      if (!extra.visitDate || !extra.visitTime || visitDateTime(extra) <= new Date()) throw domainError("Reschedule requires a future visit date and time.");
      await assertSlotAvailable({ propertyId: before.propertyId, visitType: before.visitType, ...extra }, id);
      extra.$push = { ...(extra.$push || {}), rescheduleHistory: { previousDate: before.visitDate, previousTime: before.visitTime, newDate: extra.visitDate, newTime: extra.visitTime, reason: extra.reason, actorType: actor?.type, actorId: actor?.id, changedAt: new Date() } };
      extra.$inc = { rescheduleCount: 1 };
    }
    if (to === "cancelled") {
      if (!extra.reason && !extra.cancelReason) throw domainError("Cancellation requires a reason.");
      extra.cancelReason = extra.cancelReason || extra.reason;
    }
    if (to === "confirmed" && before.visitType === "virtual" && !(before.meetingLink || extra.meetingLink)) throw domainError("Virtual visits require a meeting link before confirmation.");
    if (to === "completed") {
      const feedback = extra.feedback || {};
      if (!feedback.buyerInterest || !feedback.notes || !feedback.nextAction) throw domainError("Completed visits require feedback.");
      extra.feedback = { ...feedback, completedAt: new Date() };
    }
    const visit = await baseService.transition(id, to, actor, req, extra);
    await syncLinkedEnquiryStatus(visit, to);
    return visit;
  }
};