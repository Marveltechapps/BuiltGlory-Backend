import Redis from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";
let redis;
const memory = new Map();
export const getRedis = () => {
  if (redis) return redis;
  if (!env.REDIS_URL) {
    if (env.NODE_ENV === "production") throw new Error("REDIS_URL is required in production.");
    return {
      async get(k) { const row = memory.get(k); if (!row) return null; if (row.expiresAt && row.expiresAt < Date.now()) { memory.delete(k); return null; } return row.value; },
      async set(k, v, mode, ttl) { memory.set(k, { value: v, expiresAt: mode === "EX" ? Date.now() + ttl * 1000 : null }); return "OK"; },
      async del(k) { memory.delete(k); return 1; }
    };
  }
  redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  redis.on("error", (error) => logger.error({ message: "Redis error", error: error.message }));
  return redis;
};