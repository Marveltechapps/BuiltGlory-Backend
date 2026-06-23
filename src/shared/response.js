export const ok = (res, data, meta = {}) => res.status(200).json({ data, meta: { ...meta, requestId: res.locals.requestId } });
export const created = (res, data, meta = {}) => res.status(201).json({ data, meta: { ...meta, requestId: res.locals.requestId } });
export const noContent = (res) => res.status(204).send();