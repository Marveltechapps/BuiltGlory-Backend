import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { makeReferenceId } from "../src/shared/id.js";
import { Property } from "../src/modules/properties/model.js";
import { SalesDeal } from "../src/modules/salesDeals/model.js";
import { Acquisition } from "../src/modules/acquisitions/model.js";
import { SellRequest } from "../src/modules/sellRequests/model.js";
import { User } from "../src/modules/users/model.js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CUSTOMER_PHONE = "9876543210";
const phoneNormalized = `91${CUSTOMER_PHONE}`;

const upsertCustomer = async () => User.findOneAndUpdate(
  { phoneNormalized },
  {
    $setOnInsert: {
      referenceId: makeReferenceId("users"),
      phone: `+91 ${CUSTOMER_PHONE}`,
      phoneNormalized,
      userType: "resident",
      registeredAt: new Date()
    },
    $set: { isActive: true, isBlocked: false, role: "both", lastLoginAt: new Date() }
  },
  { upsert: true, returnDocument: "after" }
);

const upsertProperty = async () => {
  const existing = await Property.findOne({ title: "Postman Push Test Property", isDeleted: { $ne: true } });
  if (existing) return existing;
  return Property.create({
    referenceId: makeReferenceId("properties"),
    title: "Postman Push Test Property",
    description: "Seeded for push notification Postman workflow tests",
    type: "apartment",
    status: "available",
    source: "manual",
    price: 5000000,
    address: { line1: "Test Street", locality: "Central", city: "Bengaluru", state: "KA", pincode: "560001" },
    media: { photos: [], coverPhoto: null }
  });
};

const upsertSellRequest = async (sellerId) => {
  const existing = await SellRequest.findOne({ propertyTitle: "Postman Push Test Listing", isDeleted: { $ne: true } });
  if (existing) return existing;
  return SellRequest.create({
    referenceId: makeReferenceId("sellRequests"),
    sellerId,
    propertyType: "apartment",
    propertyTitle: "Postman Push Test Listing",
    askingPrice: 5000000,
    negotiable: true,
    address: { city: "Bengaluru", state: "KA", pincode: "560001", locality: "Central" },
    status: "new"
  });
};

const upsertAcquisition = async (sellRequestId, sellerId) => {
  const existing = await Acquisition.findOne({ sellRequestId, isDeleted: { $ne: true } });
  if (existing) {
    if (existing.stage !== "site_inspection") {
      existing.stage = "site_inspection";
      await existing.save();
    }
    return existing;
  }
  return Acquisition.create({
    referenceId: makeReferenceId("acquisitions"),
    sellRequestId,
    sellerId,
    stage: "site_inspection",
    createdFrom: "sell_request",
    propertyTitle: "Postman Push Test Listing",
    propertyType: "apartment",
    propertyCity: "Bengaluru",
    askingPrice: 5000000,
    lastActivityAt: new Date()
  });
};

const upsertSalesDeal = async (buyerId, propertyId) => {
  const existing = await SalesDeal.findOne({ buyerId, propertyId, stage: { $ne: "closed" }, isDeleted: { $ne: true } });
  if (existing) return existing;
  return SalesDeal.create({
    referenceId: makeReferenceId("salesDeals"),
    buyerId,
    propertyId,
    stage: "active_leads",
    propertySnapshot: { title: "Postman Push Test Property", price: 5000000, type: "apartment", location: "Bengaluru" },
    financials: { agreedPrice: 5000000, tokenAmount: 250000, tokenPaid: false, totalPaid: 0 },
    lastActivityAt: new Date()
  });
};

try {
  await connectDatabase();
  const customer = await upsertCustomer();
  const property = await upsertProperty();
  const sellRequest = await upsertSellRequest(customer._id);
  const acquisition = await upsertAcquisition(sellRequest._id, customer._id);
  const deal = await upsertSalesDeal(customer._id, property._id);

  const data = {
    customerPhone: CUSTOMER_PHONE,
    customerUserId: String(customer._id),
    propertyId: String(property._id),
    listingId: String(sellRequest._id),
    acquisitionId: String(acquisition._id),
    dealId: String(deal._id),
    adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@builtglory.com",
    adminPassword: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
    baseUrl: `http://localhost:${process.env.PORT || 5001}/api/v1`
  };

  const outPath = join(__dirname, "..", "postman", "push-notification-test-data.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log("Push notification test data seeded:");
  console.log(JSON.stringify(data, null, 2));
} finally {
  await disconnectDatabase();
}
