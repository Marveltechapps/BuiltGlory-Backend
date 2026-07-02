import { Property } from "../properties/model.js";
import { BuyEnquiry } from "../buyEnquiries/model.js";
import { SellRequest } from "../sellRequests/model.js";
import { Acquisition } from "../acquisitions/model.js";
import { SalesDeal } from "../salesDeals/model.js";
import { Visit } from "../visits/model.js";
import { Callback } from "../callbacks/model.js";
import { SupportTicket } from "../supportTickets/model.js";
import { Payment } from "../payments/model.js";
import { User } from "../users/model.js";
import { InteriorLead } from "../interiorLeads/model.js";
import { AuditLog } from "../auditLogs/model.js";
import { domainError, forbidden, notFound } from "../../shared/errors/AppError.js";
import { getPagination, paginationMeta } from "../../shared/pagination.js";
import { ReportExport } from "./exportModel.js";
import { ReportSchedule } from "./scheduleModel.js";
import crypto from "node:crypto";
import ExcelJS from "exceljs";

const clean = { isDeleted: { $ne: true } };
const overviewSlaLimits = { enquiry: 2, stagePayment: 4, interior: 24 };

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

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfLastNDays = (days) => {
  const date = startOfToday();
  date.setDate(date.getDate() - (days - 1));
  return date;
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const asId = (doc) => {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  return String(doc._id || doc.id || doc);
};

const toIso = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const formatDay = (date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(date);

const hoursElapsed = (from, now = Date.now()) => (now - new Date(from || now).getTime()) / 3600000;

const slaItem = ({ id, name, property, phone, viewPath, sourceTime, limitHours }) => {
  const elapsedHours = hoursElapsed(sourceTime);
  const remainingHours = limitHours - elapsedHours;
  return {
    id,
    name,
    property,
    phone,
    viewPath,
    sourceTime: toIso(sourceTime),
    limitHours,
    elapsedHours: Number(Math.max(0, elapsedHours).toFixed(2)),
    remainingHours: Number(remainingHours.toFixed(2)),
    progressPercent: Math.min(100, Math.max(0, Math.round((elapsedHours / limitHours) * 100))),
    status: remainingHours <= 0 ? "breached" : remainingHours <= limitHours * 0.2 ? "warning" : "ok"
  };
};

const locationOf = (property = {}) =>
  [property.address?.locality, property.address?.city].filter(Boolean).join(", ") ||
  property.address?.city ||
  property.location ||
  "";

const compactOverviewVisit = (visit) => {
  const buyer = visit.buyerId || {};
  const property = visit.propertyId || {};
  const id = asId(visit);
  return {
    id,
    referenceId: visit.referenceId,
    buyerName: buyer.name || "Buyer",
    buyerPhone: buyer.phone || buyer.mobileNumber || buyer.phoneNormalized || "",
    buyerEmail: buyer.email,
    buyerUserType: buyer.userType || "resident",
    propertyTitle: property.title || "Property",
    propertyId: asId(property) || asId(visit.propertyId),
    propertyType: property.type || "Property",
    propertyLocation: locationOf(property),
    propertyPrice: property.price || 0,
    visitDate: toIso(visit.visitDate).slice(0, 10),
    visitTime: visit.visitTime || "10:00",
    visitType: visit.visitType || "physical",
    virtualPlatform: visit.virtualPlatform || null,
    meetingLink: visit.meetingLink || null,
    status: visit.status || "scheduled",
    assignedAdmin: asId(visit.assignedAdmin),
    rescheduleCount: visit.rescheduleCount || 0,
    createdAt: toIso(visit.createdAt),
    updatedAt: toIso(visit.updatedAt || visit.createdAt),
    viewPath: `/admin/visits/${id}`
  };
};

const activityDescription = (log) => `${log.action} ${log.resourceType}`.replace(/_/g, " ");

const routeForActivity = (log) => {
  const resourceType = String(log.resourceType || "").toLowerCase();
  if (resourceType.includes("user")) return "/admin/users/all";
  if (resourceType.includes("property")) return "/admin/properties/all";
  if (resourceType.includes("sell")) return "/admin/enquiries/sell";
  if (resourceType.includes("acquisition")) return "/admin/acquisition/all";
  if (resourceType.includes("sales")) return "/admin/sales/all";
  if (resourceType.includes("support")) return "/admin/settings/support";
  return "/admin/settings/audit";
};

const nextRunFor = (frequency, from = new Date()) => {
  const date = new Date(from);
  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    date.setTime(Date.now());
    date.setHours(date.getHours() + 1, 0, 0, 0);
  }
  if (date > new Date()) return date;
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  else if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else date.setDate(date.getDate() + 1);
  return date;
};

const exportFieldMap = {
  properties: {
    ID: (item) => item.referenceId || asId(item),
    Title: (item) => item.title,
    Type: (item) => item.type,
    Price: (item) => item.price,
    Status: (item) => item.status,
    Location: (item) => [item.address?.locality, item.address?.city].filter(Boolean).join(", "),
    "Added Date": (item) => toIso(item.createdAt)
  },
  users: {
    ID: (item) => item.referenceId || asId(item),
    Name: (item) => item.name,
    Phone: (item) => item.phone || item.mobileNumber || item.phoneNormalized,
    Email: (item) => item.email,
    Type: (item) => item.userType,
    "KYC Status": (item) => item.kycStatus,
    Registered: (item) => toIso(item.registeredAt || item.createdAt)
  },
  sales: {
    "Deal ID": (item) => item.referenceId || asId(item),
    Buyer: (item) => item.buyerSnapshot?.name,
    Property: (item) => item.propertySnapshot?.title,
    Stage: (item) => item.stage,
    Amount: (item) => item.financials?.agreedPrice || item.financials?.offeredPrice || item.propertySnapshot?.price,
    Date: (item) => toIso(item.closedAt || item.lastActivityAt || item.createdAt)
  },
  acquisitions: {
    ID: (item) => item.referenceId || asId(item),
    Property: (item) => item.propertyTitle,
    Seller: (item) => item.sellerSnapshot?.name,
    Stage: (item) => item.stage,
    Price: (item) => item.finalPurchasePrice || item.agreedPrice || item.builtgloryOffer || item.askingPrice,
    Date: (item) => toIso(item.lastActivityAt || item.createdAt)
  }
};

const exportModels = {
  properties: { Model: Property, dateField: "createdAt" },
  users: { Model: User, dateField: "registeredAt" },
  sales: { Model: SalesDeal, dateField: "lastActivityAt" },
  acquisitions: { Model: Acquisition, dateField: "lastActivityAt" }
};

const normalizeReportType = (value) => {
  const type = String(value || "properties");
  if (type === "sales_deals") return "sales";
  if (exportModels[type]) return type;
  throw domainError("Unsupported report export type.");
};

const normalizeFormat = (value) => {
  const format = String(value || "xlsx").toLowerCase();
  if (format === "excel") return "xlsx";
  if (["csv", "xlsx", "pdf"].includes(format)) return format;
  throw domainError("Unsupported export format.");
};

const exportDateFilter = (field, filters = {}) => {
  const range = {};
  if (filters.from) range.$gte = new Date(filters.from);
  if (filters.to) {
    const to = new Date(filters.to);
    if (!String(filters.to).includes("T")) to.setHours(23, 59, 59, 999);
    range.$lte = to;
  }
  return Object.keys(range).length ? { [field]: range } : {};
};

const selectExportFields = (reportType, requestedFields = []) => {
  const available = Object.keys(exportFieldMap[reportType]);
  const selected = Array.isArray(requestedFields) && requestedFields.length
    ? requestedFields.filter((field) => available.includes(field))
    : available;
  return selected.length ? selected : available;
};

const buildExportRows = async (filters = {}) => {
  const reportType = normalizeReportType(filters.reportType);
  const { Model, dateField } = exportModels[reportType];
  const fields = selectExportFields(reportType, filters.fields);
  const docs = await Model.find({ ...clean, ...exportDateFilter(dateField, filters) })
    .sort({ [dateField]: -1, createdAt: -1 })
    .limit(Math.min(Number(filters.limit) || 10000, 50000))
    .lean();
  return {
    reportType,
    fields,
    rows: docs.map((doc) => Object.fromEntries(fields.map((field) => [field, exportFieldMap[reportType][field](doc) ?? ""])))
  };
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const renderCsv = (fields, rows) => Buffer.from([
  fields.map(csvCell).join(","),
  ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
].join("\n"), "utf8");

const renderXlsx = async (fields, rows) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");
  worksheet.columns = fields.map((field) => ({ header: field, key: field, width: Math.max(14, field.length + 4) }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const escapePdfText = (value) => String(value ?? "").replace(/[\\()]/g, "\\$&").slice(0, 120);

const renderPdf = (fields, rows) => {
  const lines = ["BuiltGlory Report", `Generated: ${new Date().toISOString()}`, fields.join(" | "), ...rows.slice(0, 250).map((row) => fields.map((field) => row[field]).join(" | "))];
  const content = lines.map((line, index) => `BT /F1 9 Tf 36 ${780 - index * 14} Td (${escapePdfText(line)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
};

const renderExportFile = async ({ format, fields, rows }) => {
  if (format === "csv") return { buffer: renderCsv(fields, rows), mimeType: "text/csv" };
  if (format === "pdf") return { buffer: renderPdf(fields, rows), mimeType: "application/pdf" };
  return {
    buffer: await renderXlsx(fields, rows),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
};

const normalizePropertyType = (value) => {
  const type = String(value || "").toLowerCase();
  if (!type || type === "all") return null;
  if (type.includes("villa")) return "villa";
  if (type.includes("plot") || type === "land") return "plot";
  if (type.includes("apartment")) return "apartment";
  if (type.includes("commercial") || type.includes("office") || type.includes("shop")) return "commercial";
  if (type.includes("residential") || type.includes("house")) return "residential";
  return "other";
};

const propertyTypeExpression = (field) => ({
  $switch: {
    branches: [
      { case: { $regexMatch: { input: { $toLower: { $ifNull: [field, ""] } }, regex: "villa" } }, then: "villa" },
      { case: { $regexMatch: { input: { $toLower: { $ifNull: [field, ""] } }, regex: "plot|land" } }, then: "plot" },
      { case: { $regexMatch: { input: { $toLower: { $ifNull: [field, ""] } }, regex: "apartment" } }, then: "apartment" },
      { case: { $regexMatch: { input: { $toLower: { $ifNull: [field, ""] } }, regex: "commercial|office|shop" } }, then: "commercial" },
      { case: { $regexMatch: { input: { $toLower: { $ifNull: [field, ""] } }, regex: "residential|house" } }, then: "residential" }
    ],
    default: "other"
  }
});

const reportRangeFilter = (field, query = {}) => exportDateFilter(field, query);

const monthBucket = (field) => ({ $dateToString: { date: field, format: "%Y-%m", timezone: "Asia/Kolkata" } });

export const service = {
  async loginStats() {
    const [properties, users, deals] = await Promise.all([
      Property.countDocuments(clean),
      User.countDocuments(clean),
      SalesDeal.countDocuments(clean)
    ]);
    return { properties, users, deals };
  },
  async overview() {
    const today = startOfToday();
    const dayAfterTomorrow = addDays(today, 2);
    const sevenDaysAgo = startOfLastNDays(7);
    const [
      activeProperties,
      featuredProperties,
      upcomingProperties,
      newEnquiries,
      tokenPaidDeals,
      closedDeals,
      overdueCallbacks,
      openSupportTickets,
      pendingKycUsers,
      pendingSellRequests,
      todaysVisits,
      acquisitionStages,
      salesStages,
      revenue,
      enquiriesByDay,
      propertiesByType,
      recentBuyEnquiries,
      recentSellRequests,
      stagePaymentDeals,
      interiorLeads,
      recentAuditLogs
    ] = await Promise.all([
      Property.countDocuments({ ...clean, status: { $in: ["available", "reserved", "under_construction"] } }),
      Property.countDocuments({ ...clean, isFeatured: true, status: { $in: ["available", "reserved", "under_construction"] } }),
      Property.countDocuments({ ...clean, isUpcoming: true }),
      BuyEnquiry.countDocuments({ ...clean, status: "new" }),
      SalesDeal.countDocuments({ ...clean, "financials.tokenPaid": true }),
      SalesDeal.countDocuments({ ...clean, stage: "closed" }),
      Callback.countDocuments({ ...clean, status: "overdue" }),
      SupportTicket.countDocuments({ ...clean, status: { $in: ["open", "in_progress"] } }),
      User.countDocuments({ ...clean, kycStatus: "pending" }),
      SellRequest.countDocuments({ ...clean, status: { $in: ["new", "under_review", "changes_requested"] } }),
      Visit.find({ ...clean, visitDate: { $gte: today, $lt: dayAfterTomorrow }, status: { $ne: "cancelled" } })
        .populate("buyerId", "name phone mobileNumber phoneNormalized email userType")
        .populate("propertyId", "title type price address")
        .sort({ visitDate: 1, visitTime: 1 })
        .limit(20)
        .lean(),
      countBy(Acquisition, "stage"),
      countBy(SalesDeal, "stage"),
      Payment.aggregate([{ $match: { ...clean, status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      BuyEnquiry.aggregate([
        { $match: { ...clean, submittedAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { date: "$submittedAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
        { $sort: { date: 1 } }
      ]),
      countBy(Property, "type", { ...clean, status: { $in: ["available", "reserved", "under_construction"] } }),
      BuyEnquiry.find(clean).sort({ submittedAt: -1, createdAt: -1 }).limit(5),
      SellRequest.find({ ...clean, status: { $in: ["new", "under_review", "changes_requested"] } }).sort({ submittedAt: -1, createdAt: -1 }).limit(5),
      SalesDeal.find({ ...clean, stage: "stage_payment" }).sort({ lastActivityAt: 1, createdAt: 1 }).limit(10),
      InteriorLead.find({ ...clean, status: { $in: ["new", "contacted"] } }).sort({ slaDeadline: 1, createdAt: 1 }).limit(10),
      AuditLog.find({}).sort({ createdAt: -1 }).limit(8)
    ]);
    const enquiryMap = new Map(enquiriesByDay.map((item) => [item.date, item.count]));
    const enquiryTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, day: formatDay(date), count: enquiryMap.get(key) || 0 };
    });
    const recentEnquiries = recentBuyEnquiries.map((item) => ({
      id: asId(item),
      referenceId: item.referenceId,
      buyer: item.buyerSnapshot?.name || "Buyer",
      property: item.propertySnapshot?.title || "Property",
      type: item.interestType || "Buy",
      date: toIso(item.submittedAt || item.createdAt),
      status: item.status || "new",
      viewPath: `/admin/enquiries/buy/${asId(item)}`
    }));
    const pendingApprovals = recentSellRequests.map((item) => ({
      id: asId(item),
      referenceId: item.referenceId,
      seller: item.sellerSnapshot?.name || "Seller",
      title: item.propertyTitle || "Property",
      type: item.propertyType || "Property",
      submitted: toIso(item.submittedAt || item.createdAt),
      status: item.status,
      viewPath: `/admin/enquiries/sell/${asId(item)}`
    }));
    const slaQueues = {
      enquiries: recentBuyEnquiries
        .filter((item) => item.status === "new")
        .map((item) => slaItem({
          id: asId(item),
          name: item.buyerSnapshot?.name || "Buyer",
          property: item.propertySnapshot?.title || "Property",
          phone: item.buyerSnapshot?.phone,
          viewPath: `/admin/enquiries/buy/${asId(item)}`,
          sourceTime: item.submittedAt || item.createdAt,
          limitHours: overviewSlaLimits.enquiry
        })),
      stagePayments: stagePaymentDeals.map((item) => slaItem({
        id: asId(item),
        name: item.buyerSnapshot?.name || "Buyer",
        property: item.propertySnapshot?.title || "Property",
        viewPath: `/admin/sales/${asId(item)}`,
        sourceTime: item.lastActivityAt || item.createdAt,
        limitHours: overviewSlaLimits.stagePayment
      })),
      interiorLeads: interiorLeads.map((item) => slaItem({
        id: asId(item),
        name: item.buyerSnapshot?.name || "Interior lead",
        property: item.propertySnapshot?.title || "Interior project",
        viewPath: `/admin/enquiries/interior/${asId(item)}`,
        sourceTime: item.createdAt,
        limitHours: overviewSlaLimits.interior
      }))
    };
    return {
      kpis: { activeProperties, featuredProperties, upcomingProperties, newEnquiries, tokenPaidDeals, closedDeals, revenue: revenue[0]?.total || 0, overdueCallbacks, openSupportTickets, pendingKycUsers, pendingSellRequests },
      schedule: todaysVisits.map(compactOverviewVisit),
      recentActivities: recentAuditLogs.map((log) => ({
        id: asId(log),
        description: activityDescription(log),
        time: toIso(log.createdAt),
        route: routeForActivity(log),
        resourceType: log.resourceType,
        action: log.action
      })),
      pipelineCounts: { acquisitions: acquisitionStages, sales: salesStages },
      chartSeries: { enquiriesLast7Days: enquiryTrend, propertiesByType },
      recentEnquiries,
      pendingApprovals,
      slaQueues,
      navBadges: {
        enquiries: newEnquiries,
        acquisition: acquisitionStages.filter((item) => !["acquired", "rejected"].includes(item.value)).reduce((sum, item) => sum + item.count, 0),
        sales: salesStages.filter((item) => !["closed", "lost"].includes(item.value)).reduce((sum, item) => sum + item.count, 0),
        properties: upcomingProperties,
        users: pendingKycUsers,
        admin: openSupportTickets
      }
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
  async salesAnalytics(query = {}) {
    const type = normalizePropertyType(query.propertyType);
    const match = { ...clean, ...reportRangeFilter("closedAt", query), stage: "closed" };
    const typeMatch = type ? [{ $match: { normalizedType: type } }] : [];
    const [totals, monthlyClosedDeals, revenueByType, propertyComparison, allDeals] = await Promise.all([
      SalesDeal.aggregate([
        { $match: match },
        { $addFields: { normalizedType: propertyTypeExpression("$propertySnapshot.type") } },
        ...typeMatch,
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ["$financials.agreedPrice", 0] } }, averageDealValue: { $avg: "$financials.agreedPrice" } } },
        { $project: { _id: 0, count: 1, revenue: 1, averageDealValue: { $round: [{ $ifNull: ["$averageDealValue", 0] }, 2] } } }
      ]),
      SalesDeal.aggregate([
        { $match: match },
        { $addFields: { normalizedType: propertyTypeExpression("$propertySnapshot.type") } },
        ...typeMatch,
        { $group: { _id: monthBucket("$closedAt"), deals: { $sum: 1 }, revenue: { $sum: { $ifNull: ["$financials.agreedPrice", 0] } } } },
        { $project: { _id: 0, month: "$_id", deals: 1, revenue: 1 } },
        { $sort: { month: 1 } }
      ]),
      SalesDeal.aggregate([
        { $match: match },
        { $addFields: { normalizedType: propertyTypeExpression("$propertySnapshot.type") } },
        ...typeMatch,
        { $group: { _id: "$normalizedType", revenue: { $sum: { $ifNull: ["$financials.agreedPrice", 0] } }, deals: { $sum: 1 } } },
        { $project: { _id: 0, type: "$_id", revenue: 1, deals: 1 } },
        { $sort: { revenue: -1 } }
      ]),
      Property.find({ ...clean, ...(type ? { type } : {}) }).sort({ "metrics.compareCount": -1 }).limit(5).lean(),
      SalesDeal.countDocuments({ ...clean, ...(type ? { "propertySnapshot.type": type } : {}) })
    ]);
    const count = totals[0]?.count || 0;
    return {
      stats: {
        count,
        revenue: totals[0]?.revenue || 0,
        averageDealValue: totals[0]?.averageDealValue || 0,
        conversion: allDeals ? Number(((count / allDeals) * 100).toFixed(2)) : 0
      },
      monthlyClosedDeals,
      revenueByType,
      propertyComparison: propertyComparison.map((item) => ({
        id: asId(item),
        referenceId: item.referenceId,
        title: item.title,
        type: item.type,
        price: item.price,
        views: item.metrics?.views || 0,
        enquiries: item.metrics?.enquiries || 0,
        visits: item.metrics?.visits || 0,
        compareCount: item.metrics?.compareCount || 0
      }))
    };
  },
  async acquisitionAnalytics(query = {}) {
    const type = normalizePropertyType(query.propertyType);
    const typeFilter = type ? { propertyType: type } : {};
    const match = { ...clean, ...reportRangeFilter("lastActivityAt", query), ...typeFilter };
    const [acquired, activePipeline, stageCounts, acquisitionByType] = await Promise.all([
      Acquisition.aggregate([
        { $match: { ...match, stage: "acquired" } },
        { $group: { _id: null, count: { $sum: 1 }, cost: { $sum: { $ifNull: ["$finalPurchasePrice", 0] } }, averageCost: { $avg: "$finalPurchasePrice" } } },
        { $project: { _id: 0, count: 1, cost: 1, averageCost: { $round: [{ $ifNull: ["$averageCost", 0] }, 2] } } }
      ]),
      Acquisition.countDocuments({ ...match, stage: { $nin: ["acquired", "rejected"] } }),
      Acquisition.aggregate([
        { $match: { ...clean, ...typeFilter } },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
        { $project: { _id: 0, stage: "$_id", count: 1 } },
        { $sort: { stage: 1 } }
      ]),
      Acquisition.aggregate([
        { $match: match },
        { $addFields: { value: { $ifNull: ["$finalPurchasePrice", { $ifNull: ["$agreedPrice", { $ifNull: ["$askingPrice", 0] }] }] } } },
        { $group: { _id: "$propertyType", value: { $sum: "$value" }, count: { $sum: 1 } } },
        { $project: { _id: 0, type: "$_id", value: 1, count: 1 } },
        { $sort: { value: -1 } }
      ])
    ]);
    return {
      stats: {
        count: acquired[0]?.count || 0,
        cost: acquired[0]?.cost || 0,
        averageCost: acquired[0]?.averageCost || 0,
        pipelineActive: activePipeline
      },
      stageCounts,
      acquisitionByType
    };
  },
  async revenueAnalytics(query = {}) {
    const type = normalizePropertyType(query.propertyType);
    const salesTypeMatch = type ? [{ $match: { normalizedType: type } }] : [];
    const acquisitionTypeFilter = type ? { propertyType: type } : {};
    const [closedRevenue, acquiredCost, salesMonthly, acquisitionMonthly, pendingPayments] = await Promise.all([
      SalesDeal.aggregate([
        { $match: { ...clean, stage: "closed", ...reportRangeFilter("closedAt", query) } },
        { $addFields: { normalizedType: propertyTypeExpression("$propertySnapshot.type") } },
        ...salesTypeMatch,
        { $group: { _id: null, revenue: { $sum: { $ifNull: ["$financials.agreedPrice", 0] } } } }
      ]),
      Acquisition.aggregate([
        { $match: { ...clean, stage: "acquired", ...reportRangeFilter("lastActivityAt", query), ...acquisitionTypeFilter } },
        { $group: { _id: null, cost: { $sum: { $ifNull: ["$finalPurchasePrice", 0] } } } }
      ]),
      SalesDeal.aggregate([
        { $match: { ...clean, stage: "closed", ...reportRangeFilter("closedAt", query) } },
        { $addFields: { normalizedType: propertyTypeExpression("$propertySnapshot.type") } },
        ...salesTypeMatch,
        { $group: { _id: monthBucket("$closedAt"), revenue: { $sum: { $ifNull: ["$financials.agreedPrice", 0] } } } },
        { $project: { _id: 0, month: "$_id", revenue: 1 } }
      ]),
      Acquisition.aggregate([
        { $match: { ...clean, stage: "acquired", ...reportRangeFilter("lastActivityAt", query), ...acquisitionTypeFilter } },
        { $group: { _id: monthBucket("$lastActivityAt"), cost: { $sum: { $ifNull: ["$finalPurchasePrice", 0] } } } },
        { $project: { _id: 0, month: "$_id", cost: 1 } }
      ]),
      SalesDeal.find({
        ...clean,
        stage: { $in: ["token_payment", "full_payment", "stage_payment", "documentation", "negotiation"] }
      }).sort({ lastActivityAt: 1, createdAt: 1 }).limit(25).lean()
    ]);
    const revenue = closedRevenue[0]?.revenue || 0;
    const cost = acquiredCost[0]?.cost || 0;
    const monthMap = new Map();
    salesMonthly.forEach((item) => monthMap.set(item.month, { month: item.month, revenue: item.revenue, cost: 0 }));
    acquisitionMonthly.forEach((item) => {
      const current = monthMap.get(item.month) || { month: item.month, revenue: 0, cost: 0 };
      current.cost = item.cost;
      monthMap.set(item.month, current);
    });
    const revenueVsCost = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    return {
      stats: {
        revenue,
        cost,
        profit: revenue - cost,
        margin: revenue ? Number((((revenue - cost) / revenue) * 100).toFixed(2)) : 0
      },
      revenueVsCost,
      profitTrend: revenueVsCost.map((item) => ({ month: item.month, profit: item.revenue - item.cost })),
      pendingPayments: pendingPayments.map((item) => ({
        id: asId(item),
        referenceId: item.referenceId,
        buyer: item.buyerSnapshot?.name || "Buyer",
        property: item.propertySnapshot?.title || "Property",
        stage: item.stage,
        amount: item.financials?.agreedPrice || item.financials?.offeredPrice || item.propertySnapshot?.price || 0,
        paid: item.financials?.totalPaid || 0,
        balance: Math.max(0, (item.financials?.agreedPrice || item.financials?.offeredPrice || item.propertySnapshot?.price || 0) - (item.financials?.totalPaid || 0)),
        lastActivityAt: toIso(item.lastActivityAt || item.createdAt)
      }))
    };
  },
  async exportRequest(filters = {}, actor) {
    const requestedAt = new Date();
    const expiresAt = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
    const format = normalizeFormat(filters.format);
    const extension = format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xlsx";
    const referenceId = `REPORT-${requestedAt.getUTCFullYear()}-${requestedAt.getTime()}`;
    const exportJob = await ReportExport.create({
      referenceId,
      status: "processing",
      format,
      exportTypes: [format],
      storageKey: `reports/${requestedAt.getUTCFullYear()}/${requestedAt.getTime()}.${extension}`,
      filters: { ...filters, format },
      requestedBy: actor?.id,
      requestedAt,
      expiresAt
    });
    try {
      const { reportType, fields, rows } = await buildExportRows({ ...filters, format });
      const { buffer, mimeType } = await renderExportFile({ format, fields, rows });
      exportJob.set({
        status: "completed",
        completedAt: new Date(),
        fileName: `builtglory-${reportType}-${requestedAt.toISOString().slice(0, 10)}.${extension}`,
        mimeType,
        sizeBytes: buffer.length,
        rowCount: rows.length,
        fileContent: buffer,
        downloadToken: crypto.randomBytes(24).toString("hex"),
        downloadTokenExpiresAt: expiresAt
      });
      await exportJob.save();
      return exportJob;
    } catch (error) {
      exportJob.set({ status: "failed", failedAt: new Date(), failureReason: error.message || "Export generation failed." });
      await exportJob.save();
      throw error;
    }
  },
  async createSchedule(data, actor) {
    const createdAt = new Date();
    return ReportSchedule.create({
      referenceId: `SCHEDULE-${createdAt.getUTCFullYear()}-${createdAt.getTime()}`,
      name: data.name,
      status: "active",
      reportType: data.reportType,
      format: data.format || "xlsx",
      frequency: data.frequency,
      timezone: data.timezone || "Asia/Kolkata",
      filters: data.filters || {},
      recipients: data.recipients,
      createdBy: actor?.id,
      nextRunAt: nextRunFor(data.frequency, data.nextRunAt)
    });
  },
  async listSchedules(query = {}) {
    const { page, limit, skip } = getPagination(query);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.reportType) filter.reportType = query.reportType;
    const [data, total] = await Promise.all([
      ReportSchedule.find(filter).sort({ nextRunAt: 1, createdAt: -1 }).skip(skip).limit(limit),
      ReportSchedule.countDocuments(filter)
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  },
  async listExports(query = {}) {
    const { page, limit, skip } = getPagination(query);
    const filter = {};
    if (query.status) filter.status = query.status;
    const [data, total] = await Promise.all([
      ReportExport.find(filter).sort({ requestedAt: -1 }).skip(skip).limit(limit),
      ReportExport.countDocuments(filter)
    ]);
    return { data, meta: paginationMeta(page, limit, total) };
  },
  async getExport(id) {
    const query = id.match(/^[a-f\d]{24}$/i) ? { $or: [{ _id: id }, { referenceId: id }] } : { referenceId: id };
    const exportJob = await ReportExport.findOne(query);
    if (!exportJob) throw notFound("Report export job not found.");
    return exportJob;
  },
  async getDownloadUrl(id) {
    const exportJob = await this.getExport(id);
    if (exportJob.status !== "completed") {
      return { status: exportJob.status, downloadUrl: null, expiresAt: exportJob.expiresAt, storageKey: exportJob.storageKey };
    }
    if (!exportJob.downloadToken || !exportJob.downloadTokenExpiresAt || exportJob.downloadTokenExpiresAt <= new Date()) {
      exportJob.downloadToken = crypto.randomBytes(24).toString("hex");
      exportJob.downloadTokenExpiresAt = exportJob.expiresAt > new Date() ? exportJob.expiresAt : new Date(Date.now() + 15 * 60 * 1000);
      await exportJob.save();
    }
    return {
      status: exportJob.status,
      downloadUrl: `/admin/reports/exports/${exportJob.id}/download?token=${exportJob.downloadToken}`,
      expiresAt: exportJob.downloadTokenExpiresAt,
      storageKey: exportJob.storageKey,
      fileName: exportJob.fileName,
      sizeBytes: exportJob.sizeBytes,
      rowCount: exportJob.rowCount
    };
  },
  async downloadExport(id, token) {
    const exportJob = await this.getExport(id);
    if (exportJob.status !== "completed") throw domainError("Export is not ready for download.");
    if (exportJob.expiresAt <= new Date()) {
      exportJob.status = "expired";
      await exportJob.save();
      throw domainError("Export has expired.");
    }
    if (!token || token !== exportJob.downloadToken || exportJob.downloadTokenExpiresAt <= new Date()) {
      throw forbidden("Invalid or expired export download token.");
    }
    if (!exportJob.fileContent) throw notFound("Export file content not found.");
    return {
      buffer: exportJob.fileContent,
      fileName: exportJob.fileName || `${exportJob.referenceId}.${exportJob.format}`,
      mimeType: exportJob.mimeType || "application/octet-stream"
    };
  }
};
