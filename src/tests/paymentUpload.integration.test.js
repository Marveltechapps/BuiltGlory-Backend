import crypto from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";
import { env } from "../config/env.js";
import { app, bearer, models, seedAdmin, seedCustomer, seedProperty, seedSalesDeal, setupIntegrationDb } from "./helpers/integrationHarness.js";

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
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "bank", transactionReference: "UTR123456", idempotencyKey: "pay-once" });
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe("pending");
    expect(first.body.data.gateway).toBe("escrow");
    expect(first.body.data.gatewayOrderId).toBeFalsy();
    expect(global.fetch).not.toHaveBeenCalled();

    const second = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "bank", transactionReference: "UTR123456", idempotencyKey: "pay-once" });
    expect(second.status).toBe(201);
    expect(second.body.data._id).toBe(first.body.data._id);
    expect(second.body.data.status).toBe("pending");

    const list = await request(app).get("/api/v1/me/payments").set("Authorization", bearer(token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  test("duplicate pending token payments for the same deal are reused", async () => {
    const { user, token } = await seedCustomer();
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);

    const first = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "bank", idempotencyKey: "pay-a" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "cash", idempotencyKey: "pay-b" });
    expect(second.status).toBe(201);
    expect(second.body.data._id).toBe(first.body.data._id);
  });

  test("manual token payment stays pending and is never auto-marked paid", async () => {
    const { user, token } = await seedCustomer();
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);

    const res = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "bank", transactionReference: "NEFT9988", idempotencyKey: "escrow-once" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.gateway).toBe("escrow");
    expect(res.body.data.method).toBe("bank");
    expect((await models.SalesDeal.findById(deal._id)).financials.tokenPaid).not.toBe(true);
    expect((await models.Property.findById(property._id)).status).not.toBe("reserved");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("admin verifies a pending token payment, reserves the property, and writes audit fields", async () => {
    const { user, token } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["sales.read", "sales.write"] });
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);

    const created = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "bank", transactionReference: "UTR777", notes: "Paid from HDFC", idempotencyKey: "verify-once" });
    expect(created.status).toBe(201);
    const paymentId = created.body.data._id;

    const listed = await request(app)
      .get(`/api/v1/admin/payments?dealId=${deal._id}&status=pending`)
      .set("Authorization", bearer(admin.token));
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    const verified = await request(app)
      .patch(`/api/v1/admin/payments/${paymentId}/verify`)
      .set("Authorization", bearer(admin.token))
      .send({ decision: "paid", notes: "UTR matched in bank statement" });
    expect(verified.status).toBe(200);
    expect(verified.body.data.status).toBe("paid");
    expect(verified.body.data.transactionReference).toBe("UTR777");
    expect(String(verified.body.data.verifiedBy)).toBe(String(admin.admin._id));
    expect(verified.body.data.verifiedAt).toBeTruthy();
    expect(verified.body.data.verificationNotes).toContain("UTR matched");

    const updatedDeal = await models.SalesDeal.findById(deal._id);
    expect(updatedDeal.financials.tokenPaid).toBe(true);
    expect((await models.Property.findById(property._id)).status).toBe("reserved");
  });

  test("admin can reject a pending payment and the buyer can submit again", async () => {
    const { user, token } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["sales.read", "sales.write"] });
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);

    const created = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "cash", notes: "Paid at office", idempotencyKey: "reject-once" });
    expect(created.status).toBe(201);

    const rejected = await request(app)
      .patch(`/api/v1/admin/payments/${created.body.data._id}/verify`)
      .set("Authorization", bearer(admin.token))
      .send({ decision: "rejected", notes: "Receipt not found at office" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe("rejected");
    expect((await models.SalesDeal.findById(deal._id)).financials.tokenPaid).not.toBe(true);

    const retry = await request(app)
      .post("/api/v1/payments/token")
      .set("Authorization", bearer(token))
      .send({ dealId: String(deal._id), amount: 250000, currency: "INR", method: "bank", transactionReference: "UTR-RETRY", idempotencyKey: "reject-once" });
    expect(retry.status).toBe(201);
    expect(retry.body.data.status).toBe("pending");
    expect(retry.body.data._id).not.toBe(created.body.data._id);
  });

  test("payment webhook cannot mark a manual escrow payment as paid", async () => {
    const { user } = await seedCustomer();
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);
    const paymentId = new models.Payment.base.Types.ObjectId();
    await models.Payment.collection.insertOne({
      _id: paymentId,
      referenceId: "PAY-ESCROW-1",
      userId: user._id,
      dealId: deal._id,
      propertyId: property._id,
      type: "token",
      amount: 250000,
      currency: "INR",
      status: "pending",
      method: "bank",
      gateway: "escrow",
      gatewayOrderId: "order_escrow_blocked",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const payload = JSON.stringify({ event_id: "evt_escrow_1", created_at: Math.floor(Date.now() / 1000), event: "payment.captured", payload: { payment: { entity: { id: "pay_escrow_1", order_id: "order_escrow_blocked", status: "captured", amount: 250000, currency: "INR" } } } });
    const signature = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest("hex");
    const res = await request(app).post("/api/v1/payments/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", signature).send(payload);
    expect(res.status).toBe(422);
    expect((await models.Payment.findById(paymentId)).status).toBe("pending");
    expect((await models.SalesDeal.findById(deal._id)).financials.tokenPaid).not.toBe(true);
  });

  test("payment webhook validates signature and reserves property on captured token", async () => {
    const { user } = await seedCustomer();
    const property = await seedProperty();
    const deal = await seedSalesDeal(user._id, property._id);
    const paymentId = new models.Payment.base.Types.ObjectId();
    const payment = { _id: paymentId, referenceId: "PAY-INT-1", userId: user._id, dealId: deal._id, propertyId: property._id, type: "token", amount: 1000, currency: "INR", status: "pending", method: "razorpay", gateway: "razorpay", gatewayOrderId: "order_capture_1", isDeleted: false, createdAt: new Date(), updatedAt: new Date() };
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
