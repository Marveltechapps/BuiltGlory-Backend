import { jest } from "@jest/globals";
import { Callback } from "../modules/callbacks/model.js";
import { SupportTicket } from "../modules/supportTickets/model.js";
import { Visit } from "../modules/visits/model.js";
import { SalesDeal } from "../modules/salesDeals/model.js";
import { Acquisition } from "../modules/acquisitions/model.js";
import { Document } from "../modules/documents/model.js";
import { Notification } from "../modules/notifications/model.js";
import { User } from "../modules/users/model.js";
import { markOverdueCallbacks, markOverdueSupportTickets, enqueueVisitReminders, enqueueDealFollowUps, retryDocumentScans, calculateStageAging } from "../jobs/index.js";
import { dispatchNotification, enqueueNotification, processNotificationQueue } from "../services/notification.service.js";

const objectId = "0123456789abcdef01234567";
const original = new Map();
const patch = (target, key, value) => {
  original.set(`${target.modelName || "obj"}:${key}`, [target, key, target[key]]);
  target[key] = value;
};

afterEach(() => {
  for (const [, [target, key, value]] of original) target[key] = value;
  original.clear();
  jest.restoreAllMocks();
});

describe("jobs and notification queues", () => {
  test("marks overdue callbacks and support tickets under locks", async () => {
    patch(Callback, "updateMany", jest.fn(async () => ({ modifiedCount: 2 })));
    patch(SupportTicket, "updateMany", jest.fn(async () => ({ modifiedCount: 1 })));
    await expect(markOverdueCallbacks()).resolves.toMatchObject({ modifiedCount: 2 });
    await expect(markOverdueSupportTickets()).resolves.toMatchObject({ modifiedCount: 1 });
  });

  test("enqueues visit reminders idempotently", async () => {
    patch(Visit, "find", jest.fn(async () => [{ _id: objectId, buyerId: objectId, visitDate: new Date("2030-01-01") }]));
    patch(Notification, "findOne", jest.fn(async () => null));
    patch(User, "findById", jest.fn(async () => null));
    patch(Notification, "create", jest.fn(async (doc) => doc));
    const result = await enqueueVisitReminders();
    expect(result).toHaveLength(1);
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ event: "visit_reminder" }));
  });

  test("enqueues deal follow-ups and retries document scans", async () => {
    patch(SalesDeal, "find", jest.fn(() => ({ limit: async () => [{ _id: objectId, buyerId: objectId, stage: "negotiation" }] })));
    patch(Notification, "findOne", jest.fn(async () => null));
    patch(User, "findById", jest.fn(async () => null));
    patch(Notification, "create", jest.fn(async (doc) => doc));
    patch(Document, "updateMany", jest.fn(async () => ({ modifiedCount: 3 })));
    await expect(enqueueDealFollowUps()).resolves.toHaveLength(1);
    await expect(retryDocumentScans()).resolves.toMatchObject({ modifiedCount: 3 });
  });

  test("calculates stage aging", async () => {
    patch(Acquisition, "find", jest.fn(async () => [{ _id: objectId, lastActivityAt: new Date(Date.now() - 2 * 86400000) }]));
    patch(SalesDeal, "find", jest.fn(async () => [{ _id: objectId, lastActivityAt: new Date(Date.now() - 86400000) }]));
    patch(Acquisition, "findByIdAndUpdate", jest.fn(async () => ({})));
    patch(SalesDeal, "findByIdAndUpdate", jest.fn(async () => ({})));
    await calculateStageAging();
    expect(Acquisition.findByIdAndUpdate).toHaveBeenCalled();
    expect(SalesDeal.findByIdAndUpdate).toHaveBeenCalled();
  });

  test("enqueueNotification respects user preferences", async () => {
    patch(User, "findById", jest.fn(async () => ({ notificationPreferences: { sms: { marketing: false, transactional: true } } })));
    patch(Notification, "create", jest.fn(async (doc) => doc));
    const result = await enqueueNotification({ userId: objectId, event: "promo", channel: "sms", recipient: "9999999999", marketing: true });
    expect(result.status).toBe("cancelled");
  });

  test("dispatchNotification sends in-app and process queue drains due rows", async () => {
    patch(Notification, "findByIdAndUpdate", jest.fn(async (id, patchDoc) => ({ _id: id, ...patchDoc })));
    const sent = await dispatchNotification({ _id: objectId, status: "queued", channel: "in_app", recipient: objectId, templateId: "deal_follow_up", payload: {}, attempts: 0, maxAttempts: 5 });
    expect(sent.status).toBe("sent");
    patch(Notification, "find", jest.fn(() => ({ limit: async () => [{ _id: objectId, status: "queued", channel: "in_app", recipient: objectId, templateId: "deal_follow_up", payload: {}, attempts: 0, maxAttempts: 5 }] })));
    const processed = await processNotificationQueue();
    expect(processed).toHaveLength(1);
  });
});
