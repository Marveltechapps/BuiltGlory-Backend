import request from "supertest";
import { createApp } from "../app.js";
describe("BuiltGlory API", () => {
  const app = createApp();
  test("serves health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
  test("serves OpenAPI", async () => {
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
  });
  test("validates customer OTP request", async () => {
    const res = await request(app).post("/api/v1/auth/customer/otp/send").send({ phone: "123" });
    expect(res.status).toBe(400);
  });
});