import { AppError, conflict } from "../shared/errors/AppError.js";
import { logger } from "../config/logger.js";

const DUPLICATE_FIELD_MESSAGES = {
  email: "This email is already registered to another account.",
  mobileNumber: "This phone number is already registered to another account.",
  phoneNormalized: "This phone number is already registered to another account.",
  referenceId: "A conflicting account reference already exists."
};

const isDuplicateKeyError = (err) => {
  const code = err?.code ?? err?.errorResponse?.code;
  if (code === 11000 || code === "11000" || code === "E11000") return true;
  if (err?.codeName === "DuplicateKey" || err?.errorResponse?.codeName === "DuplicateKey") return true;
  return typeof err?.message === "string" && /E11000|duplicate key/i.test(err.message);
};

const mapDuplicateKeyError = (err) => {
  if (!isDuplicateKeyError(err)) return null;
  const keyPattern = err.keyPattern || err.errorResponse?.keyPattern || {};
  const keyValue = err.keyValue || err.errorResponse?.keyValue || {};
  let field = Object.keys(keyPattern)[0] || Object.keys(keyValue)[0];
  if (!field && typeof err.message === "string") {
    const indexed = err.message.match(/index:\s*([a-zA-Z0-9_]+)/);
    if (indexed?.[1]) field = indexed[1].replace(/_1$/, "").replace(/_\d+$/, "");
  }
  field = field || "value";
  const value = keyValue[field];
  // Explicit nulls on sparse unique indexes are data bugs, not user email/phone clashes.
  const message = (value === null || value === undefined)
    ? "Could not update profile contact fields. Please try again."
    : (DUPLICATE_FIELD_MESSAGES[field] || `A record with this ${field} already exists.`);
  return conflict(message, [{ field, message, value }]);
};

export const notFoundHandler = (req, res, next) => next(new AppError(404, "NOT_FOUND", "Route not found."));
export const errorHandler = (err, req, res, next) => {
  const mapped = mapDuplicateKeyError(err) || err;
  const statusCode = mapped.statusCode || 500;
  if (statusCode >= 500 || !mapped.isOperational) {
    logger.error({
      requestId: res.locals.requestId,
      error: mapped.message,
      code: mapped.code,
      stack: mapped.stack || err.stack,
      details: mapped.details
    });
  } else {
    logger.warn({
      requestId: res.locals.requestId,
      error: mapped.message,
      code: mapped.code,
      statusCode,
      details: mapped.details
    });
  }
  res.status(statusCode).json({
    error: {
      code: mapped.code || "INTERNAL_SERVER_ERROR",
      message: statusCode >= 500 && !mapped.isOperational ? "Unexpected server error." : mapped.message,
      details: mapped.details || []
    },
    meta: { requestId: res.locals.requestId }
  });
};