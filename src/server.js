import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
await connectDatabase();
const app = createApp();
app.listen(env.PORT, () => logger.info({ message: "BuiltGlory API listening", port: env.PORT }));