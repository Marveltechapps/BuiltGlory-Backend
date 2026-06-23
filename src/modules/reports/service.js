import { Property } from "../properties/model.js";
import { BuyEnquiry } from "../buyEnquiries/model.js";
import { SellRequest } from "../sellRequests/model.js";
import { Acquisition } from "../acquisitions/model.js";
import { SalesDeal } from "../salesDeals/model.js";
import { Visit } from "../visits/model.js";
import { Callback } from "../callbacks/model.js";
import { SupportTicket } from "../supportTickets/model.js";
import { Payment } from "../payments/model.js";

const clean = { isDeleted: { $ne: true } };

const countBy = async (Model, field, filter = clean) =>
  Model.aggregate([{ $match: filter }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $project: { _id: 0, value: "$_id", count: 1 } }]);

const avgBy = async (Model, field, filter = clean) =>
  Model.aggregate([{ $match: filter }, { $group: { _id: `$${field}`, count: { $sum: 1 }, averageDaysInStage: { $avg: "$daysInStage" } } }, { $project: { _id: 0, value: "$_id", count: 1, averageDaysInStage: { $round: ["$averageDaysInStage", 2] } } }]);

const dateFilter = (query = {}) => {
  const createdAt = {};
  if (query.from) createdAt.$gte = new Date(query.from);
  if (query.to) createdAt.$lte = new Date(query.to);
  return Object.keys(createdAt).length ? { ...clean, createdAt } : clean;
};

export const service = {
  async overview() {
    const [activeProperties, featuredProperties, upcomingProperties, newEnquiries, tokenPaidDeals, closedDeals, overdueCallbacks, openSupportTickets, todaysVisits, acquisitionStages, salesStages, revenue] = await Promise.all([
      Property.countDocuments({ ...clean, status: { $in: ["available", "reserved", "under_construction"] } }),
      Property.countDocuments({ ...clean, isFeatured: true, status: { $in: ["available", "reserved", "under_construction"] } }),
      Property.countDocuments({ ...clean, isUpcoming: true }),
      BuyEnquiry.countDocuments({ ...clean, status: "new" }),
      SalesDeal.countDocuments({ ...clean, "financials.tokenPaid": true }),
      SalesDeal.countDocuments({ ...clean, stage: "closed" }),
      Callback.countDocuments({ ...clean, status: "overdue" }),
      SupportTicket.countDocuments({ ...clean, status: { $in: ["open", "in_progress"] } }),
      Visit.find({ ...clean, visitDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }).sort({ visitDate: 1 }).limit(10),
      countBy(Acquisition, "stage"),
      countBy(SalesDeal, "stage"),
      Payment.aggregate([{ $match: { ...clean, status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);
    return {
      kpis: { activeProperties, featuredProperties, upcomingProperties, newEnquiries, tokenPaidDeals, closedDeals, revenue: revenue[0]?.total || 0, overdueCallbacks, openSupportTickets },
      schedule: todaysVisits,
      recentActivities: [],
      pipelineCounts: { acquisitions: acquisitionStages, sales: salesStages }
    };
  },
  async summary(query) {
    const filter = dateFilter(query);
    const [properties, enquiries, visits, completedVisits, sellRequests, acquisitions, deals, closedDeals, payments, overdueCallbacks, openSupportTickets, acquisitionAging, salesAging, revenueByType] = await Promise.all([
      Property.countDocuments(filter),
      BuyEnquiry.countDocuments(filter),
      Visit.countDocuments(filter),
      Visit.countDocuments({ ...filter, status: "completed" }),
      SellRequest.countDocuments(filter),
      Acquisition.countDocuments(filter),
      SalesDeal.countDocuments(filter),
      SalesDeal.countDocuments({ ...filter, stage: "closed" }),
      Payment.aggregate([{ $match: { ...filter, status: "paid" } }, { $group: { _id: null, revenue: { $sum: "$amount" }, payments: { $sum: 1 } } }]),
      Callback.countDocuments({ ...filter, status: "overdue" }),
      SupportTicket.countDocuments({ ...filter, status: { $in: ["open", "in_progress"] } }),
      avgBy(Acquisition, "stage", filter),
      avgBy(SalesDeal, "stage", filter),
      Payment.aggregate([{ $match: { ...filter, status: "paid" } }, { $group: { _id: "$type", revenue: { $sum: "$amount" }, payments: { $sum: 1 } } }, { $project: { _id: 0, type: "$_id", revenue: 1, payments: 1 } }])
    ]);
    return {
      properties,
      enquiries,
      visits,
      completedVisits,
      visitConversionRate: visits ? Number(((completedVisits / visits) * 100).toFixed(2)) : 0,
      sellRequests,
      acquisitions,
      deals,
      closedDeals,
      dealConversionRate: enquiries ? Number(((closedDeals / enquiries) * 100).toFixed(2)) : 0,
      payments: payments[0]?.payments || 0,
      revenue: payments[0]?.revenue || 0,
      revenueByType,
      overdueCallbacks,
      openSupportTickets,
      stageAging: { acquisitions: acquisitionAging, sales: salesAging },
      funnel: { enquiries, visits, deals, closedDeals },
      sellerReport: { sellRequests, acquisitions },
      buyerReport: { enquiries, visits, deals }
    };
  },
  async exportRequest(filters = {}) {
    const requestedAt = new Date();
    const expiresAt = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
    const format = filters.format || "xlsx";
    const extension = format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xlsx";
    return { referenceId: `REPORT-${requestedAt.getUTCFullYear()}-${requestedAt.getTime()}`, status: "queued", format, exportTypes: ["csv", "xlsx", "pdf"], storageKey: `reports/${requestedAt.getUTCFullYear()}/${requestedAt.getTime()}.${extension}`, filters, requestedAt, expiresAt };
  }
};
