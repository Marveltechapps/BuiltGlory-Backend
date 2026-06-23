import request from "supertest";
import { app, bearer, models, seedAdmin, seedCustomer, seedProperty, setupIntegrationDb } from "./helpers/integrationHarness.js";

setupIntegrationDb();

describe("admin reports, audit, health, and property operations", () => {
  test("health, readiness, metrics, and OpenAPI endpoints respond", async () => {
    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/ready")).status).toBe(200);
    expect((await request(app).get("/metrics")).status).toBe(200);
    expect((await request(app).get("/openapi.json")).body.openapi).toBe("3.1.0");
  });

  test("admin reports overview, summary, and export endpoints respond", async () => {
    const admin = await seedAdmin({ permissions: ["sales.read", "audit.read"] });
    await seedProperty();
    const overview = await request(app).get("/api/v1/admin/overview").set("Authorization", bearer(admin.token));
    expect(overview.status).toBe(200);
    expect(overview.body.data.kpis).toBeTruthy();

    const summary = await request(app).get("/api/v1/admin/reports/summary").set("Authorization", bearer(admin.token));
    expect(summary.status).toBe(200);
    expect(summary.body.data.funnel).toBeTruthy();

    const exported = await request(app).post("/api/v1/admin/reports/export").set("Authorization", bearer(admin.token)).send({ filters: { format: "csv" } });
    expect(exported.status).toBe(201);
    expect(exported.body.data.status).toBe("queued");
  });

  test("admin audit log list returns immutable audit entries", async () => {
    const admin = await seedAdmin({ permissions: ["audit.read"] });
    await models.AuditLog.create({ actorType: "admin", actorId: admin.admin._id, action: "unit.audit", resourceType: "unit", before: null, after: { ok: true } });
    const res = await request(app).get("/api/v1/admin/audit-logs").set("Authorization", bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test("admin property create, update, publish, media upload pending review, and bulk upload validation", async () => {
    const admin = await seedAdmin({ permissions: ["properties.read", "properties.write", "properties.publish"] });
    const created = await request(app)
      .post("/api/v1/admin/properties")
      .set("Authorization", bearer(admin.token))
      .send({ title: "Admin Property", description: "Full details", type: "plot", price: 1200000, status: "draft", address: { locality: "Central", city: "Bengaluru", state: "KA", pincode: "560001" }, media: { coverPhoto: "s3://bucket/cover.jpg" } });
    expect(created.status).toBe(201);

    const updated = await request(app).patch(`/api/v1/admin/properties/${created.body.data._id}`).set("Authorization", bearer(admin.token)).send({ isFeatured: true });
    expect(updated.status).toBe(200);
    expect(updated.body.data.isFeatured).toBe(true);

    const published = await request(app).patch(`/api/v1/admin/properties/${created.body.data._id}/status`).set("Authorization", bearer(admin.token)).send({ status: "available" });
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe("available");

    const media = await request(app)
      .post(`/api/v1/admin/properties/${created.body.data._id}/media`)
      .set("Authorization", bearer(admin.token))
      .field("documentType", "photo")
      .attach("files", Buffer.from("not-image"), { filename: "bad.txt", contentType: "text/plain" });
    expect(media.status).toBe(422);

    const csv = "title,type,city,locality,pincode,price\nPlot,plot,Bengaluru,Central,560001,100000";
    const bulk = await request(app).post("/api/v1/admin/properties/bulk-upload").set("Authorization", bearer(admin.token)).attach("file", Buffer.from(csv), { filename: "properties.csv", contentType: "text/csv" });
    expect(bulk.status).toBe(201);
    expect(bulk.body.data.rowsAccepted).toBe(1);
  });

  test("admin sales-team, designers, and user list endpoints respond", async () => {
    const admin = await seedAdmin({ permissions: ["users.read", "support.read"] });
    await seedAdmin({ role: "sales_executive", permissions: ["sales.read"] });
    await seedAdmin({ role: "designer", permissions: ["support.read"] });
    await seedCustomer();

    expect((await request(app).get("/api/v1/admin/sales-team").set("Authorization", bearer(admin.token))).status).toBe(200);
    expect((await request(app).get("/api/v1/admin/designers").set("Authorization", bearer(admin.token))).status).toBe(200);
    const users = await request(app).get("/api/v1/admin/users").set("Authorization", bearer(admin.token));
    expect(users.status).toBe(200);
    expect(users.body.data).toHaveLength(1);
  });
});
