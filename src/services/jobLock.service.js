import { getRedis } from "../config/redis.js";

export const withJobLock = async (name, work, ttlSeconds = 300) => {
  const redis = getRedis();
  const key = `job:lock:${name}`;
  const existing = await redis.get(key);
  if (existing) return { skipped: true, reason: "locked" };
  await redis.set(key, String(Date.now()), "EX", ttlSeconds);
  try {
    return await work();
  } finally {
    await redis.del(key);
  }
};
