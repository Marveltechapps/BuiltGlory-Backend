import request from "supertest";
import { app, bearer, models, seedAdmin, seedBuyEnquiry, seedCustomer, seedProperty, seedSellRequest, setupIntegrationDb } from "./helpers/integrationHarness.js";

setupIntegrationDb();

describe("domain workflows integration", () => {
  test("customer browses, saves, lists favorites, and unsaves a property", async () => {
    const { token } = await seedCustomer();
    const property = await seedProperty();

    const list = await request(app).get("/api/v1/properties?city=Bengaluru&page=1&limit=10");
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const detail = await request(app).get(`/api/v1/properties/${property._id}`);
    expect(detail.status).toBe(200);

    const save = await request(app).post(`/api/v1/properties/${property._id}/save`).set("Authorization", bearer(token));
    expect(save.status).toBe(200);
    expect(save.body.data.metrics.savedCount).toBe(1);

    const favorites = await request(app).get("/api/v1/me/favorites").set("Authorization", bearer(token));
    expect(favorites.status).toBe(200);
    expect(favorites.body.data).toHaveLength(1);

    const unsave = await request(app).delete(`/api/v1/properties/${property._id}/save`).set("Authorization", bearer(token));
    expect(unsave.status).toBe(204);
  });

  test("admin converts seeded enquiry to sales deal", async () => {
    const { user } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["enquiries.read", "enquiries.write", "sales.write"] });
    const property = await seedProperty();
    const enquiry = await seedBuyEnquiry(user._id, property._id);

    const converted = await request(app)
      .post(`/api/v1/admin/buy-enquiries/${enquiry._id}/convert-to-deal`)
      .set("Authorization", bearer(admin.token))
      .send({});
    expect(converted.status).toBe(201);
    expect(converted.body.data.stage).toBe("active_leads");
  });

  test("customer schedules, reschedules, and cancels a visit", async () => {
    const { token } = await seedCustomer();
    const property = await seedProperty();
    const visitDate = new Date(Date.now() + 2 * 86400000).toISOString();

    const create = await request(app)
      .post("/api/v1/visits")
      .set("Authorization", bearer(token))
      .send({ propertyId: String(property._id), visitDate, visitTime: "10:00", visitType: "physical" });
    expect(create.status).toBe(201);

    const reschedule = await request(app)
      .patch(`/api/v1/visits/${create.body.data._id}/reschedule`)
      .set("Authorization", bearer(token))
      .send({ visitDate: new Date(Date.now() + 3 * 86400000).toISOString(), visitTime: "11:00", reason: "Need later slot" });
    expect(reschedule.status).toBe(200);
    expect(reschedule.body.data.status).toBe("rescheduled");

    const cancel = await request(app)
      .patch(`/api/v1/visits/${create.body.data._id}/cancel`)
      .set("Authorization", bearer(token))
      .send({ reason: "Travel plan changed" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe("cancelled");
  });

  test("sell request creates acquisition and advances acquisition stage", async () => {
    const { user } = await seedCustomer({ role: "seller" });
    const admin = await seedAdmin({ permissions: ["acquisitions.read", "acquisitions.write"] });
    const sellRequest = await seedSellRequest(user._id, { status: "approved" });

    const acquisition = await request(app)
      .post(`/api/v1/admin/sell-requests/${sellRequest._id}/create-acquisition`)
      .set("Authorization", bearer(admin.token))
      .send({});
    expect(acquisition.status).toBe(201);
    expect(acquisition.body.data.stage).toBe("pending_review");

    const stage = await request(app)
      .patch(`/api/v1/admin/acquisitions/${acquisition.body.data._id}/stage`)
      .set("Authorization", bearer(admin.token))
      .send({ stage: "site_inspection", notes: "Inspection assigned" });
    expect(stage.status).toBe(200);
    expect(stage.body.data.stage).toBe("site_inspection");
  });

  test("sales deal offer, token payment, payment plan, and close update linked property", async () => {
    const { user } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["sales.read", "sales.write"] });
    const property = await seedProperty();
    const enquiry = await seedBuyEnquiry(user._id, property._id);

    const dealRes = await request(app)
      .post(`/api/v1/admin/buy-enquiries/${enquiry._id}/convert-to-deal`)
      .set("Authorization", bearer(admin.token))
      .send({});
    expect(dealRes.status).toBe(201);
    const dealId = dealRes.body.data._id;

    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/offer`).set("Authorization", bearer(admin.token)).send({ agreedPrice: 1000000 })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/stage`).set("Authorization", bearer(admin.token)).send({ stage: "site_visits" })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/stage`).set("Authorization", bearer(admin.token)).send({ stage: "negotiation" })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/token-payment`).set("Authorization", bearer(admin.token)).send({ tokenAmount: 10000, tokenPaid: true })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/stage`).set("Authorization", bearer(admin.token)).send({ stage: "token_payment" })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/payment-plan`).set("Authorization", bearer(admin.token)).send({ paymentType: "full", totalPaid: 1000000 })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/stage`).set("Authorization", bearer(admin.token)).send({ stage: "full_payment" })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/stage`).set("Authorization", bearer(admin.token)).send({ stage: "documentation" })).status).toBe(200);
    const closed = await request(app).patch(`/api/v1/admin/sales/deals/${dealId}/close`).set("Authorization", bearer(admin.token)).send({ notes: "All payment terms completed" });
    expect(closed.status).toBe(200);
    expect(closed.body.data.stage).toBe("closed");
    const updatedProperty = await models.Property.findById(property._id);
    expect(updatedProperty.status).toBe("sold");
  });
});
