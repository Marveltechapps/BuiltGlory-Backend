pm.test("Status code is successful or expected error", function () {
  pm.expect([200, 201, 204, 400, 401, 403, 404, 409, 422, 429]).to.include(pm.response.code);
});

if (pm.response.code !== 204) {
  pm.test("Response is JSON", function () {
    pm.response.to.have.header("Content-Type");
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
  });

  const body = pm.response.json();
  pm.test("Response has standard envelope", function () {
    pm.expect(body).to.satisfy((value) => Boolean(value.data || value.error));
    pm.expect(body.meta).to.be.an("object");
    pm.expect(body.meta.requestId).to.be.a("string");
  });
}
