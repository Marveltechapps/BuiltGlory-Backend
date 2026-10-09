import { assertTransition, validatePropertyPublication } from "../shared/workflows.js";
describe("workflow guards", () => {
  test("rejects invalid property transition", () => {
    expect(() => assertTransition("propertyStatus", "sold", "available")).toThrow("Invalid state transition");
  });
  test("requires public listing fields", () => {
    expect(() => validatePropertyPublication({ title: "x", address: {}, media: {} })).toThrow("Property cannot be published");
  });
  test("allows stage payment to advance to documentation", () => {
    expect(() => assertTransition("salesDealStage", "stage_payment", "documentation")).not.toThrow();
  });
  test("rejects invalid sales deal transition", () => {
    expect(() => assertTransition("salesDealStage", "stage_payment", "closed")).toThrow("Invalid state transition");
  });
  test("allows acquisition inspection to valuation without skipping gates later", () => {
    expect(() => assertTransition("acquisitionStage", "site_inspection", "valuation")).not.toThrow();
    expect(() => assertTransition("acquisitionStage", "pending_review", "valuation")).toThrow("Invalid state transition");
  });
  test("allows on-hold resume, reject, and rejected reconsider", () => {
    expect(() => assertTransition("acquisitionStage", "on_hold", "negotiation")).not.toThrow();
    expect(() => assertTransition("acquisitionStage", "on_hold", "rejected")).not.toThrow();
    expect(() => assertTransition("acquisitionStage", "rejected", "pending_review")).not.toThrow();
  });
  test("rejects invalid lost-to-leads shortcut", () => {
    expect(() => assertTransition("salesDealStage", "lost", "active_leads")).toThrow("Invalid state transition");
    expect(() => assertTransition("salesDealStage", "lost", "re_engagement")).not.toThrow();
  });
  test("allows accepted sell requests to become active, paused, or sold", () => {
    expect(() => assertTransition("sellRequestStatus", "accepted", "active")).not.toThrow();
    expect(() => assertTransition("sellRequestStatus", "accepted", "paused")).not.toThrow();
    expect(() => assertTransition("sellRequestStatus", "active", "sold")).not.toThrow();
    expect(() => assertTransition("sellRequestStatus", "paused", "active")).not.toThrow();
  });
  test("allows pending manual payments to be verified, rejected, or cancelled", () => {
    expect(() => assertTransition("paymentStatus", "pending", "paid")).not.toThrow();
    expect(() => assertTransition("paymentStatus", "pending", "rejected")).not.toThrow();
    expect(() => assertTransition("paymentStatus", "pending", "cancelled")).not.toThrow();
    expect(() => assertTransition("paymentStatus", "rejected", "paid")).toThrow("Invalid state transition");
  });
});