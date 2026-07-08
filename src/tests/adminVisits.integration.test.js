import request from "supertest";
import { app, bearer, models, seedAdmin, seedCustomer, seedProperty, setupIntegrationDb } from "./helpers/integrationHarness.js";
import { makeReferenceId } from "../shared/id.js";

setupIntegrationDb();

const seedVisit = async (buyerId, propertyId, overrides = {}) => {
  const visitDate = new Date(Date.now() + 2 * 86400000);
  return models.Visit.create({
    referenceId: makeReferenceId("visits"),
    buyerId,
    propertyId,
    visitDate,
    visitTime: "10:00 AM",
    visitType: "physical",
    status: "scheduled",
    buyerSnapshot: { name: "Buyer", phone: "+91 9876543210", email: "buyer@example.com" },
    propertySnapshot: { title: "Test Property", price: 1000000, type: "plot", location: "Bengaluru" },
    ...overrides
  });
};

describe("admin visit actions", () => {
  test("supports confirm, complete, missed, cancel, reschedule, reassign, and metadata updates", async () => {
    const { user } = await seedCustomer({ email: "buyer@example.com" });
    const admin = await seedAdmin({ permissions: ["enquiries.read", "enquiries.write"] });
    const property = await seedProperty();
    const visit = await seedVisit(user._id, property._id);
    const visitId = String(visit._id);
    const futureDate = new Date(Date.now() + 4 * 86400000).toISOString();

    const confirm = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "confirmed" });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe("confirmed");

    const reassign = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "confirmed", assignedAdmin: String(admin.admin._id) });
    expect(reassign.status).toBe(200);
    expect(String(reassign.body.data.assignedAdmin)).toBe(String(admin.admin._id));

    const reminder = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "confirmed", reminderSent: true });
    expect(reminder.status).toBe(200);
    expect(reminder.body.data.reminderSent).toBe(true);

    const reschedule = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "rescheduled", visitDate: futureDate, visitTime: "11:00 AM", reason: "Buyer requested later slot" });
    expect(reschedule.status).toBe(200);
    expect(reschedule.body.data.status).toBe("rescheduled");

    const missed = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "missed", reason: "Buyer no show" });
    expect(missed.status).toBe(200);
    expect(missed.body.data.status).toBe("missed");
  });

  test("allows completing a scheduled visit directly with feedback", async () => {
    const { user } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["enquiries.read", "enquiries.write"] });
    const property = await seedProperty();
    const visit = await seedVisit(user._id, property._id);
    const visitId = String(visit._id);

    const complete = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({
        status: "completed",
        feedback: {
          buyerInterest: "interested",
          notes: "Marked completed from visit list.",
          nextAction: "follow_up"
        }
      });
    expect(complete.status).toBe(200);
    expect(complete.body.data.status).toBe("completed");
    expect(complete.body.data.feedback.buyerInterest).toBe("interested");
  });

  test("rejects invalid state transitions with a descriptive error", async () => {
    const { user } = await seedCustomer();
    const admin = await seedAdmin({ permissions: ["enquiries.read", "enquiries.write"] });
    const property = await seedProperty();
    const visit = await seedVisit(user._id, property._id, { status: "completed" });
    const visitId = String(visit._id);

    const response = await request(app)
      .patch(`/api/v1/admin/visits/${visitId}/status`)
      .set("Authorization", bearer(admin.token))
      .send({ status: "confirmed" });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("Invalid state transition");
  });
});
