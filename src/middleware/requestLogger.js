import { logger } from "../config/logger.js";
import { incrementMetric, observeMetric } from "../services/metrics.service.js";

export const requestLogger = (req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    incrementMetric("http_requests_total", { method: req.method, statusCode: res.statusCode });
    observeMetric("http_request_duration_ms", durationMs, { method: req.method, statusCode: res.statusCode });
    logger.info({
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      actorType: req.actor?.type,
      actorId: req.actor?.id ? String(req.actor.id) : undefined
    });
  });
  next();
};
