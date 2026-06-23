const sanitizeValue = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith("$") && !key.includes("."))
      .map(([key, nested]) => [key, sanitizeValue(nested)])
  );
};

const mutateSanitized = (target) => {
  if (!target || typeof target !== "object") return;
  if (Buffer.isBuffer(target) || ArrayBuffer.isView(target)) return;
  const sanitized = sanitizeValue(target);
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, sanitized);
};

export const mongoSanitize = (req, res, next) => {
  mutateSanitized(req.body);
  mutateSanitized(req.query);
  mutateSanitized(req.params);
  next();
};
