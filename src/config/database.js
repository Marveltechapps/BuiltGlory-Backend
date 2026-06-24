import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

const redactMongoUri = (uri) => {
  try {
    const parsed = new URL(uri);
    if (parsed.username) parsed.username = "redacted";
    if (parsed.password) parsed.password = "redacted";
    return parsed.toString();
  } catch {
    return "<invalid MongoDB URI>";
  }
};

const getTopologyDiagnostics = (error) => {
  const topology = error?.reason || error?.cause;
  if (!topology?.servers) return undefined;

  return {
    type: topology.type,
    setName: topology.setName,
    compatible: topology.compatible,
    servers: [...topology.servers.entries()].map(([address, server]) => ({
      address,
      type: server.type,
      errorName: server.error?.name,
      errorCode: server.error?.code || server.error?.cause?.code,
      errorMessage: server.error?.message,
      beforeHandshake: server.error?.beforeHandshake,
      tlsReason: server.error?.cause?.reason,
      tlsCode: server.error?.cause?.code
    }))
  };
};

const logMongoConnectionError = (error) => {
  logger.error({
    message: "MongoDB connection failed",
    name: error.name,
    code: error.code,
    reason: error.reason?.type,
    errorMessage: error.message,
    uri: redactMongoUri(env.MONGODB_URI),
    topology: getTopologyDiagnostics(error),
    stack: error.stack
  });
};

let hasConnected = false;
let isInitialConnection = false;
let listenersInstalled = false;
let suppressConnectionErrorsUntil = 0;

export const connectDatabase = async () => {
  mongoose.set("strictQuery", true);

  if (!listenersInstalled) {
    mongoose.connection.on("connected", () => {
      hasConnected = true;
      logger.info({ message: "MongoDB connected" });
    });
    mongoose.connection.on("disconnected", () => {
      if (hasConnected) logger.warn({ message: "MongoDB disconnected" });
    });
    mongoose.connection.on("error", (error) => {
      if (Date.now() < suppressConnectionErrorsUntil) return;
      if (!isInitialConnection) logMongoConnectionError(error);
    });
    listenersInstalled = true;
  }

  try {
    isInitialConnection = true;
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      tls: env.MONGODB_URI.startsWith("mongodb+srv://")
    });
  } catch (error) {
    logMongoConnectionError(error);
    suppressConnectionErrorsUntil = Date.now() + 2000;
    throw error;
  } finally {
    isInitialConnection = false;
  }
};
export const disconnectDatabase = () => mongoose.disconnect();