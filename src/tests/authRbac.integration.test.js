import request from "supertest";
import { app, bearer, seedAdmin, seedCustomer, setupIntegrationDb } from "./helpers/integrationHarness.js";

setupIntegrationDb();

describe("auth and RBAC integration", () => {
  test("admin token can access protected admin route", async () => {
    const admin = await seedAdmin();
    const list = await request(app).get("/api/v1/admin/properties").set("Authorization", bearer(admin.token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveProperty("data");
  });

  test("admin login validates malformed payload", async () => {
    const res = await request(app).post("/api/v1/auth/admin/login").send({ email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("RBAC denies missing permission and allows matching permission", async () => {
    const limited = await seedAdmin({ role: "support", permissions: ["support.read"] });
    const denied = await request(app).get("/api/v1/admin/properties").set("Authorization", bearer(limited.token));
    expect(denied.status).toBe(403);

    const allowedAdmin = await seedAdmin({ permissions: ["properties.read"] });
    const allowed = await request(app).get("/api/v1/admin/properties").set("Authorization", bearer(allowedAdmin.token));
    expect(allowed.status).toBe(200);
  });

  test("customer token cannot access admin route", async () => {
    const { token } = await seedCustomer();
    const res = await request(app).get("/api/v1/admin/users").set("Authorization", bearer(token));
    expect(res.status).toBe(401);
  });

  test("unauthenticated protected route returns unauthorized envelope", async () => {
    const res = await request(app).get("/api/v1/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
    expect(res.body.meta.requestId).toBeTruthy();
  });
});
