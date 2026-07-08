import request from "supertest";
import { app, setupIntegrationDb, seedAdmin, bearer } from "./helpers/integrationHarness.js";

setupIntegrationDb();

describe("admin content API", () => {
  it("lists, creates, updates, and deletes legal content", async () => {
    const { token } = await seedAdmin();

    const listRes = await request(app)
      .get("/api/v1/admin/content")
      .query({ section: "legal", limit: 100, sort: "newest" })
      .set("Authorization", bearer(token));

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const createRes = await request(app)
      .post("/api/v1/admin/content")
      .set("Authorization", bearer(token))
      .send({
        slug: "test-legal-page",
        section: "legal",
        title: "Test Legal Page",
        excerpt: "Test excerpt",
        body: "Test body content",
        category: "custom",
        status: "published",
        metadata: { lastUpdatedLabel: "1 Jan 2026" },
      });

    expect(createRes.status).toBe(201);
    const contentId = createRes.body.data._id;
    expect(contentId).toBeTruthy();

    const updateRes = await request(app)
      .patch(`/api/v1/admin/content/${contentId}`)
      .set("Authorization", bearer(token))
      .send({ title: "Updated Legal Page" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe("Updated Legal Page");

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/content/${contentId}`)
      .set("Authorization", bearer(token));

    expect(deleteRes.status).toBe(204);
  });

  it("rejects update with slug instead of object id", async () => {
    const { token } = await seedAdmin();

    const res = await request(app)
      .patch("/api/v1/admin/content/terms-of-service")
      .set("Authorization", bearer(token))
      .send({ title: "Updated" });

    expect(res.status).toBe(400);
  });
});
