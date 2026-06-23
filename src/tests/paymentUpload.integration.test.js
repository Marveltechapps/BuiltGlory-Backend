import crypto from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";
import { env } from "../config/env.js";
import { app, bearer, models, seedCustomer, seedProperty, seedSalesDeal, setupIntegrationDb } from "./helpers/integrationHarness.js";

setupIntegrationDb();

describe("payment, webhook, and upload integration", () => {
  beforeEach(() => {
    env.RAZORPAY_KEY_ID = "rzp_test_key";
    env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
    env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret_123456";
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ id: "order_test_123", status: "created" }) }));
  });

  afterEach(() => {
    delete global.fetch;
    env.MALWARE_SCANNER_MODE = "disabled";
  });

  test("customer creates token payment idempotently and lists own payments", async () => {
    const { user, token } = await seedCustomer();
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);

    const first = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 1000, currency: "INR", idempotencyKey: "pay-once" });
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe("pending");

    const second = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 1000, currency: "INR", idempotencyKey: "pay-once" });
    expect(second.status).toBe(201);
    expect(second.body.data._id).toBe(first.body.data._id);

    const list = await request(app).get("/api/v1/me/payments").set("Authorization", bearer(token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  test("payment webhook validates signature and reserves property on captured token", async () => {
    const { user } = await seedCustomer();
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);
    const paymentId = new models.Payment.base.Types.ObjectId();
    const payment = { _id: paymentId, referenceId: "PAY-INT-1", userId: user._id, dealId: deal._id, propertyId: property._id, type: "token", amount: 1000, currency: "INR", status: "pending", gatewayOrderId: "order_capture_1", isDeleted: false, createdAt: new Date(), updatedAt: new Date() };
    await models.Payment.collection.insertOne(payment);
    const payload = JSON.stringify({ event_id: "evt_capture_1", created_at: Math.floor(Date.now() / 1000), event: "payment.captured", payload: { payment: { entity: { id: "pay_capture_1", order_id: payment.gatewayOrderId, status: "captured", amount: 1000, currency: "INR" } } } });
    const signature = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest("hex");

    const res = await request(app).post("/api/v1/payments/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", signature).send(payload);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("paid");
    expect((await models.Property.findById(property._id)).status).toBe("reserved");

    const duplicate = await request(app).post("/api/v1/payments/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", signature).send(payload);
    expect(duplicate.status).toBe(409);
  });

  test("payment webhook rejects invalid signature", async () => {
    const payload = JSON.stringify({ event_id: "evt_bad", created_at: Math.floor(Date.now() / 1000), payload: {} });
    const res = await request(app).post("/api/v1/payments/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", "bad").send(payload);
    expect(res.status).toBe(401);
  });

  test("upload rejects unsupported file type", async () => {
    const { user, token } = await seedCustomer();
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", bearer(token))
      .field("ownerType", "user")
      .field("ownerId", String(user._id))
      .field("purpose", "kyc")
      .field("documentType", "pan")
      .attach("file", Buffer.from("hello"), { filename: "bad.exe", contentType: "application/x-msdownload" });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain("Unsupported file type");
  });

  test("upload rejects infected document before S3 write", async () => {
    env.MALWARE_SCANNER_MODE = "provider";
    const { user, token } = await seedCustomer();
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", bearer(token))
      .field("ownerType", "user")
      .field("ownerId", String(user._id))
      .field("purpose", "kyc")
      .field("documentType", "pan")
      .attach("file", Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"), { filename: "scan.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain("malware");
  });
});
