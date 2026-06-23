import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import { runAllJobs } from "./index.js";

try {
  await connectDatabase();
  await runAllJobs();
  logger.info({ message: "BuiltGlory jobs completed" });
} catch (error) {
  logger.error({ message: "BuiltGlory jobs failed", error: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
