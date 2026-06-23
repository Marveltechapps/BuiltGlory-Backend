import request from "supertest";
import { app, bearer, models, seedAdmin, seedCustomer, seedProperty, setupIntegrationDb } from "./helpers/integrationHarness.js";
import { makeReferenceId } from "../shared/id.js";

setupIntegrationDb();

describe("operations modules integration", () => {
  test("support ticket lifecycle creates, lists, responds, and resolves", async () => {
    const { token } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["support.read", "support.write"] });

    const created = await request(app)
      .post("/api/v1/support/tickets")
      .set("Authorization", bearer(token))
      .send({ category: "technical", subject: "App issue", message: "Need help" });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("open");

    const mine = await request(app).get("/api/v1/me/support/tickets").set("Authorization", bearer(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);

    const response = await request(app)
      .post(`/api/v1/admin/support/tickets/${created.body.data._id}/responses`)
      .set("Authorization", bearer(admin.token))
      .send({ message: "We are checking this", resolve: false });
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("in_progress");

    const resolved = await request(app)
      .patch(`/api/v1/admin/support/tickets/${created.body.data._id}`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "resolved", resolutionResponse: "Fixed" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe("resolved");
  });

  test("callback lifecycle creates attempts, reschedules, and resolves", async () => {
    const { token } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["support.read", "support.write"] });
    const preferredTime = new Date(Date.now() + 86400000).toISOString();

    const created = await request(app).post("/api/v1/callbacks").set("Authorization", bearer(token)).send({ source: "help_support", preferredTime });
    expect(created.status).toBe(201);

    const attempt = await request(app)
      .post(`/api/v1/admin/callbacks/${created.body.data._id}/attempts`)
      .set("Authorization", bearer(admin.token))
      .send({ outcome: "callback_later", notes: "Asked to call tomorrow", preferredTime: new Date(Date.now() + 2 * 86400000).toISOString() });
    expect(attempt.status).toBe(201);
    expect(attempt.body.data.status).toBe("rescheduled");

    const resolved = await request(app)
      .patch(`/api/v1/admin/callbacks/${created.body.data._id}/resolve`)
      .set("Authorization", bearer(admin.token))
      .send({ resolutionNotes: "Resolved by phone" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe("resolved");
  });

  test("admin user block and assignment actions update user state", async () => {
    const { user } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["users.read", "users.kyc.review"] });

    const assign = await request(app).patch(`/api/v1/admin/users/${user._id}/assign`).set("Authorization", bearer(admin.token)).send({ assignedTo: String(admin.admin._id) });
    expect(assign.status).toBe(200);
    expect(String(assign.body.data.assignedTo)).toBe(String(admin.admin._id));

    const block = await request(app).patch(`/api/v1/admin/users/${user._id}/block`).set("Authorization", bearer(admin.token)).send({ isBlocked: true, blockedReason: "Security review" });
    expect(block.status).toBe(200);
    expect(block.body.data.isBlocked).toBe(true);
  });

  test("interior lead admin list and quote validation paths", async () => {
    const { user } = await seedCustomer();
    const property = await seedProperty();
    const admin = await seedAdmin({ permissions: ["support.read", "support.write"] });
    const lead = {
      _id: new models.InteriorLead.base.Types.ObjectId(),
      referenceId: makeReferenceId("interiorLeads"),
      buyerId: user._id,
      propertyId: property._id,
      selectedRooms: ["living"],
      designStyle: "modern",
      budgetRange: "standard",
      userType: "resident",
      status: "new",
      slaDeadline: new Date(Date.now() + 86400000),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await models.InteriorLead.collection.insertOne(lead);

    const list = await request(app).get("/api/v1/admin/interior/leads").set("Authorization", bearer(admin.token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const invalidQuote = await request(app).patch(`/api/v1/admin/interior/leads/${lead._id}`).set("Authorization", bearer(admin.token)).send({ status: "quote_sent", quote: { amount: 1000 } });
    expect(invalidQuote.status).toBe(422);

    const validQuote = await request(app).patch(`/api/v1/admin/interior/leads/${lead._id}`).set("Authorization", bearer(admin.token)).send({ status: "quote_sent", quote: { amount: 1000, packageName: "Basic", timeline: "2 weeks", inclusions: ["design"], validUntil: new Date(Date.now() + 86400000).toISOString() } });
    expect(validQuote.status).toBe(200);
    expect(validQuote.body.data.status).toBe("quote_sent");
  });

  test("notifications and admin message tools work with RBAC", async () => {
    const { user, token } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["support.read", "support.write"] });
    await models.Notification.collection.insertOne({ _id: new models.Notification.base.Types.ObjectId(), referenceId: makeReferenceId("notifications"), userId: user._id, event: "unit", channel: "in_app", status: "queued", recipient: String(user._id), templateId: "deal_follow_up", isDeleted: false, createdAt: new Date(), updatedAt: new Date() });

    const mine = await request(app).get("/api/v1/me/notifications").set("Authorization", bearer(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);

    const templates = await request(app).get("/api/v1/admin/message-templates").set("Authorization", bearer(admin.token));
    expect(templates.status).toBe(200);
    expect(templates.body.data.length).toBeGreaterThan(0);

    const bulk = await request(app).post("/api/v1/admin/bulk-messages").set("Authorization", bearer(admin.token)).send({ recipients: [String(user._id)], channel: "in_app", templateId: "deal_follow_up", payload: {} });
    expect(bulk.status).toBe(201);
    expect(bulk.body.data.queuedCount).toBe(1);
  });
});
