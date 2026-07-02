import request from "supertest";
import ExcelJS from "exceljs";
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
    expect(exported.body.data.status).toBe("completed");
    expect(exported.body.data.fileName).toMatch(/\.csv$/);
    expect(exported.body.data.rowCount).toBeGreaterThanOrEqual(0);
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

  test("admin property bulk upload accepts downloaded XLSX template format", async () => {
    const admin = await seedAdmin({ permissions: ["properties.write"] });
    const headers = [
      "referenceId",
      "title",
      "type",
      "city",
      "locality",
      "pincode",
      "price",
      "description",
      "status",
      "address",
      "line2",
      "state",
      "landmark",
      "latitude",
      "longitude",
      "isNegotiable",
      "bhk",
      "builtUpArea",
      "carpetArea",
      "plotArea",
      "facing",
      "furnishing",
      "possession",
      "transactionType",
      "amenities",
      "highlights",
      "builderName",
      "photos",
      "advantagesInvestment",
      "nearbyPlaces"
    ];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Properties");
    worksheet.addRow(headers);
    worksheet.addRow([
      "XLSX-TEMPLATE-001",
      "Downloaded Template Property",
      "plot",
      "Bengaluru",
      "Central",
      "560001",
      1500000,
      "Imported from downloaded template",
      "available",
      "123 Template Street",
      "",
      "Karnataka",
      "Near Metro",
      "",
      "",
      "false",
      "",
      "",
      "",
      2400,
      "East",
      "",
      "Ready to move",
      "Sale",
      "Gated Community, Security",
      "Prime location, Verified",
      "Template Builder",
      "https://example.com/photo-a.jpg, https://example.com/photo-b.jpg",
      "High rental demand, Growth corridor",
      JSON.stringify([{ name: "Metro", type: "metro", distance: "1 km" }])
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const bulk = await request(app)
      .post("/api/v1/admin/properties/bulk-upload")
      .set("Authorization", bearer(admin.token))
      .attach("file", buffer, {
        filename: "builtglory-property-bulk-upload-template.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

    expect(bulk.status).toBe(201);
    expect(bulk.body.data.valid).toBe(true);
    expect(bulk.body.data.rowsAccepted).toBe(1);
    expect(bulk.body.data.rowsRejected).toBe(0);

    const inserted = await models.Property.findOne({ referenceId: "XLSX-TEMPLATE-001" }).lean();
    expect(inserted).toMatchObject({
      title: "Downloaded Template Property",
      type: "plot",
      source: "bulk_upload",
      price: 1500000
    });
    expect(inserted.address).toMatchObject({
      city: "Bengaluru",
      locality: "Central",
      pincode: "560001"
    });
    expect(inserted.specs).toMatchObject({ builderName: "Template Builder" });
    expect(inserted.amenities).toEqual(["Gated Community", "Security"]);
    expect(inserted.media.photos).toEqual(["https://example.com/photo-a.jpg", "https://example.com/photo-b.jpg"]);
    expect(inserted.advantages.investment).toEqual(["High rental demand", "Growth corridor"]);
    expect(inserted.nearbyPlaces.map(({ name, type, distance }) => ({ name, type, distance }))).toEqual([{ name: "Metro", type: "metro", distance: "1 km" }]);
  });

  test("admin property bulk template supports empty, valued, and persisted row edits", async () => {
    const admin = await seedAdmin({ permissions: ["properties.read", "properties.write"] });
    const property = await seedProperty({
      title: "Template Source",
      type: "apartment",
      price: 2500000,
      address: { line1: "Tower A", locality: "Whitefield", city: "Bengaluru", state: "KA", pincode: "560066" },
      specs: { bhk: "3", builtUpArea: 1400, facing: "East" },
      amenities: ["Lift", "Parking"],
      highlights: ["Ready to move"]
    });

    const empty = await request(app)
      .get("/api/v1/admin/properties/bulk-template?mode=empty")
      .set("Authorization", bearer(admin.token));
    expect(empty.status).toBe(200);
    expect(empty.body.data.fields.some((field) => field.key === "title")).toBe(true);
    expect(empty.body.data.fields.some((field) => field.key === "builderName")).toBe(true);
    expect(empty.body.data.fields.some((field) => field.key === "photos")).toBe(true);
    expect(empty.body.data.rows).toHaveLength(0);

    const valued = await request(app)
      .get("/api/v1/admin/properties/bulk-template?mode=valued")
      .set("Authorization", bearer(admin.token));
    expect(valued.status).toBe(200);
    const row = valued.body.data.rows.find((item) => item.propertyId === String(property._id));
    expect(row).toMatchObject({
      title: "Template Source",
      type: "apartment",
      city: "Bengaluru",
      locality: "Whitefield",
      pincode: "560066",
      price: 2500000
    });

    const updated = await request(app)
      .patch(`/api/v1/admin/properties/${property._id}`)
      .set("Authorization", bearer(admin.token))
      .send({ title: "Template Edited", address: { city: "Mysuru", locality: "Central", pincode: "570001" }, price: 2600000 });
    expect(updated.status).toBe(200);

    const persisted = await models.Property.findById(property._id).lean();
    expect(persisted.title).toBe("Template Edited");
    expect(persisted.address.city).toBe("Mysuru");
    expect(persisted.price).toBe(2600000);
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
