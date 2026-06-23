import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";
export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info({ message: "MongoDB connected" });
};
export const disconnectDatabase = () => mongoose.disconnect();