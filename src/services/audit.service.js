import { AuditLog } from "../modules/auditLogs/model.js";
export const writeAuditLog = async ({ actor, action, resourceType, resourceId, before, after, req }, options = {}) => {
  if (!actor || !["admin", "customer", "system"].includes(actor.type)) return null;
  return AuditLog.create([{
    actorType: actor.type,
    actorId: actor.id,
    action,
    resourceType,
    resourceId,
    before,
    after,
    ipAddress: req?.ip,
    userAgent: req?.headers?.["user-agent"]
  }], options).then((r) => r[0]);
};