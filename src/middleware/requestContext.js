import { randomUUID } from "node:crypto";
export const requestContext = (req, res, next) => {
  res.locals.requestId = req.headers["x-request-id"] || randomUUID();
  res.setHeader("x-request-id", res.locals.requestId);
  next();
};