import http from "node:http";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initChatSocket } from "./realtime/chatSocket.js";
await connectDatabase();
const app = createApp();
const server = http.createServer(app);
const port = env.PORT;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.error({
      message: "BuiltGlory API port is already in use",
      port,
      hint: `Stop the process using port ${port} or set PORT to a free port in .env.`
    });
    process.exit(1);
  }

  logger.error({ message: "BuiltGlory API failed to start", error: error.message, stack: error.stack });
  process.exit(1);
});

initChatSocket(server);
server.listen(port, () => {
  logger.info({ message: "BuiltGlory API listening", port });
  logger.info({ message: "BuiltGlory realtime chat listening" });
});