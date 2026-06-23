export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}
export const badRequest = (message, details) => new AppError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (message = "Authentication required.") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Permission denied.") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Resource not found.") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message = "Conflict.") => new AppError(409, "CONFLICT", message);
export const domainError = (message, details) => new AppError(422, "DOMAIN_RULE_VIOLATION", message, details);