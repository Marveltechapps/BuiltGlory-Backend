const body = pm.response.json();

if (body.data && body.data.accessToken) {
  pm.environment.set("accessToken", body.data.accessToken);
}

if (body.data && body.data.refreshToken) {
  pm.environment.set("refreshToken", body.data.refreshToken);
}

if (body.data && body.data.admin && body.data.accessToken) {
  pm.environment.set("adminToken", body.data.accessToken);
  pm.environment.set("adminRefreshToken", body.data.refreshToken);
}

if (body.data && body.data.requestId) {
  pm.environment.set("otpRequestId", body.data.requestId);
}

pm.test("Auth response has expected token fields when successful", function () {
  if (pm.response.code === 200) {
    pm.expect(body.data || body).to.be.an("object");
  }
});
