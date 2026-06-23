import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { blacklistAccessToken, signAccessToken, signRefreshToken } from "../middleware/auth.js";
import { getRedis } from "../config/redis.js";

describe("security token helpers", () => {
  test("signs access tokens with issuer and audience", () => {
    const token = signAccessToken({ sub: "user-1", type: "customer", role: "buyer" });
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    expect(decoded.sub).toBe("user-1");
    expect(decoded.aud).toBe(env.JWT_AUDIENCE);
    expect(decoded.iss).toBe(env.JWT_ISSUER);
    expect(decoded.jti).toBeTruthy();
  });

  test("signs refresh tokens with issuer and audience", () => {
    const token = signRefreshToken({ sub: "admin-1", type: "admin", role: "admin", jti: "refresh-1" });
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    expect(decoded.jti).toBe("refresh-1");
  });

  test("blacklists access tokens in Redis-compatible store", async () => {
    const token = signAccessToken({ sub: "user-2", type: "customer", role: "buyer" });
    await blacklistAccessToken(token);
    const hash = await import("node:crypto").then((crypto) => crypto.createHash("sha256").update(token).digest("hex"));
    await expect(getRedis().get(`access:blacklist:${hash}`)).resolves.toBe("1");
  });
});
