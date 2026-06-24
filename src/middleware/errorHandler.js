import { AppError } from "../shared/errors/AppError.js";
import { logger } from "../config/logger.js";
export const notFoundHandler = (req, res, next) => next(new AppError(404, "NOT_FOUND", "Route not found."));
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) logger.error({ requestId: res.locals.requestId, error: err.message, stack: err.stack });
  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: statusCode >= 500 && !err.isOperational ? "Unexpected server error." : err.message,
      details: err.details || []
    },
    meta: { requestId: res.locals.requestId }
  });
};