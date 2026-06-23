import { createRepository } from "../shared/repositoryFactory.js";
import { mongoSanitize } from "../middleware/mongoSanitize.js";
import { AppError, badRequest, conflict, domainError, forbidden, notFound, unauthorized } from "../shared/errors/AppError.js";

describe("shared infrastructure", () => {
  test("repository list applies forced filters after user filters", async () => {
    let capturedFilter;
    const Model = {
      modelName: "Fake",
      find(filter) {
        capturedFilter = filter;
        return { sort: () => ({ skip: () => ({ limit: async () => [] }) }) };
      },
      countDocuments: async () => 0
    };
    const repository = createRepository(Model);
    const result = await repository.list({ page: 1, limit: 10, userId: "attacker", status: "open" }, { userId: "owner" });
    expect(capturedFilter.userId).toBe("owner");
    expect(capturedFilter.status).toBe("open");
    expect(result.meta.total).toBe(0);
  });

  test("mongo sanitizer removes operator and dotted keys", () => {
    const req = { body: { safe: true, $where: "bad", nested: { "a.b": "bad", ok: 1 } }, query: { "$gt": "bad", q: "ok" }, params: {} };
    mongoSanitize(req, {}, () => {});
    expect(req.body.$where).toBeUndefined();
    expect(req.body.nested["a.b"]).toBeUndefined();
    expect(req.query.$gt).toBeUndefined();
    expect(req.query.q).toBe("ok");
  });

  test("app error helpers expose consistent codes", () => {
    expect(new AppError(418, "TEAPOT", "short").statusCode).toBe(418);
    expect(badRequest().code).toBe("VALIDATION_ERROR");
    expect(unauthorized().statusCode).toBe(401);
    expect(forbidden().statusCode).toBe(403);
    expect(notFound().statusCode).toBe(404);
    expect(conflict().statusCode).toBe(409);
    expect(domainError().statusCode).toBe(422);
  });
});
