import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../app.js";
import { signAccessToken } from "../../middleware/auth.js";
import { makeReferenceId } from "../../shared/id.js";
import { Admin } from "../../modules/admins/model.js";
import { User } from "../../modules/users/model.js";
import { Property } from "../../modules/properties/model.js";
import { BuyEnquiry } from "../../modules/buyEnquiries/model.js";
import { SellRequest } from "../../modules/sellRequests/model.js";
import { Acquisition } from "../../modules/acquisitions/model.js";
import { SalesDeal } from "../../modules/salesDeals/model.js";
import { Payment } from "../../modules/payments/model.js";
import { Visit } from "../../modules/visits/model.js";
import { Document } from "../../modules/documents/model.js";
import { Notification } from "../../modules/notifications/model.js";
import { AuditLog } from "../../modules/auditLogs/model.js";
import { SupportTicket } from "../../modules/supportTickets/model.js";
import { Callback } from "../../modules/callbacks/model.js";
import { InteriorLead } from "../../modules/interiorLeads/model.js";

let mongo;

export const app = createApp();

export const setupIntegrationDb = () => {
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(mongo.getUri());
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
};

export const bearer = (token) => `Bearer ${token}`;
const rawInsert = async (Model, doc) => {
  const now = new Date();
  const payload = { _id: new mongoose.Types.ObjectId(), isDeleted: false, createdAt: now, updatedAt: now, ...doc };
  await Model.collection.insertOne(payload);
  return Model.findById(payload._id);
};

export const seedAdmin = async (overrides = {}) => {
  const admin = await rawInsert(Admin, {
    name: "Admin",
    email: overrides.email || `admin-${Date.now()}@builtglory.test`,
    passwordHash: await bcrypt.hash(overrides.password || "Password123!", 10),
    role: overrides.role || "super_admin",
    permissions: overrides.permissions || ["properties.read", "properties.write", "properties.publish", "users.read", "users.kyc.review", "users.fema.review", "enquiries.read", "enquiries.write", "acquisitions.read", "acquisitions.write", "sales.read", "sales.write", "support.read", "support.write", "admin.access.manage", "audit.read"],
    isActive: overrides.isActive ?? true
  });
  const token = signAccessToken({ sub: String(admin._id), type: "admin", role: admin.role, permissions: admin.permissions });
  return { admin, token };
};

export const seedCustomer = async (overrides = {}) => {
  const suffix = String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const user = await rawInsert(User, {
    referenceId: makeReferenceId("users"),
    phone: overrides.phone || `+91 9${suffix}`,
    phoneNormalized: overrides.phoneNormalized || `919${suffix}`,
    name: overrides.name || "Customer",
    role: overrides.role || "buyer",
    userType: overrides.userType || "resident",
    kycStatus: overrides.kycStatus || "verified",
    kycDocuments: overrides.kycDocuments || [{ type: "pan", documentType: "pan", status: "verified" }, { type: "aadhaar", documentType: "aadhaar", status: "verified" }],
    isActive: overrides.isActive ?? true,
    isBlocked: overrides.isBlocked ?? false,
    ...overrides
  });
  const token = signAccessToken({ sub: String(user._id), type: "customer", role: user.role, userType: user.userType });
  return { user, token };
};

export const seedProperty = (overrides = {}) => rawInsert(Property, {
  referenceId: makeReferenceId("properties"),
  title: "Test Property",
  description: "Ready for integration tests",
  type: "plot",
  status: "available",
  source: "manual",
  price: 1000000,
  address: { line1: "Street 1", locality: "Central", city: "Bengaluru", state: "KA", pincode: "560001" },
  media: { photos: ["s3://bucket/photo.jpg"], coverPhoto: "s3://bucket/photo.jpg" },
  ...overrides
});

export const seedBuyEnquiry = (buyerId, propertyId, overrides = {}) => rawInsert(BuyEnquiry, {
  referenceId: makeReferenceId("buyEnquiries"),
  buyerId,
  buyerSnapshot: { name: "Customer", phone: "9999999999", userType: "resident" },
  propertyId,
  propertySnapshot: { title: "Test Property", price: 1000000, type: "plot", location: "Bengaluru" },
  enquiryTypes: ["buy"],
  preferredContact: "phone",
  interestType: "more_details",
  status: "new",
  ...overrides
});

export const seedSellRequest = (sellerId, overrides = {}) => rawInsert(SellRequest, {
  referenceId: makeReferenceId("sellRequests"),
  sellerId,
  sellerSnapshot: { name: "Seller", phone: "9999999999", userType: "resident", kycStatus: "verified" },
  propertyTitle: "Seller Plot",
  propertyType: "plot",
  askingPrice: 900000,
  address: { locality: "Central", city: "Bengaluru", state: "KA", pincode: "560001" },
  photos: ["s3://bucket/photo.jpg", "s3://bucket/photo2.jpg", "s3://bucket/photo3.jpg"],
  documents: [{ name: "sale_deed", status: "uploaded" }, { name: "khata_certificate", status: "uploaded" }, { name: "property_tax_receipt", status: "uploaded" }, { name: "identity_proof", status: "uploaded" }],
  status: "approved",
  ...overrides
});

export const seedAcquisition = (sellRequestId, sellerId, overrides = {}) => rawInsert(Acquisition, {
  referenceId: makeReferenceId("acquisitions"),
  sellRequestId,
  sellerId,
  stage: "pending_review",
  createdFrom: "sell_request",
  propertyTitle: "Seller Plot",
  propertyType: "plot",
  propertyCity: "Bengaluru",
  askingPrice: 900000,
  lastActivityAt: new Date(),
  ...overrides
});

export const seedSalesDeal = (buyerId, propertyId, overrides = {}) => rawInsert(SalesDeal, {
  referenceId: makeReferenceId("salesDeals"),
  buyerId,
  propertyId,
  stage: "active_leads",
  propertySnapshot: { title: "Test Property", price: 1000000, type: "plot", location: "Bengaluru" },
  financials: { agreedPrice: 1000000, tokenAmount: 10000, tokenPaid: false, totalPaid: 0 },
  lastActivityAt: new Date(),
  ...overrides
});

export const models = { Admin, User, Property, BuyEnquiry, SellRequest, Acquisition, SalesDeal, Payment, Visit, Document, Notification, AuditLog, SupportTicket, Callback, InteriorLead };
