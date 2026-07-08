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
});