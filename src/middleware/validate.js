import { badRequest } from "../shared/errors/AppError.js";
const mutate = (target, source) => {
  if (!source || target === source) return;
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
};
export const validate = (schema) => (req, res, next) => {
  const { value, error } = schema.validate({ body: req.body, query: req.query, params: req.params }, { abortEarly: false, stripUnknown: true });
  if (error) return next(badRequest("One or more fields are invalid.", error.details.map((d) => ({ field: d.path.join("."), message: d.message }))));
  mutate(req.body, value.body);
  mutate(req.query, value.query);
  mutate(req.params, value.params);
  next();
};