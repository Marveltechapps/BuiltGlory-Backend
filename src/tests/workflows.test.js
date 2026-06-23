import { assertTransition, validatePropertyPublication } from "../shared/workflows.js";
describe("workflow guards", () => {
  test("rejects invalid property transition", () => {
    expect(() => assertTransition("propertyStatus", "sold", "available")).toThrow("Invalid state transition");
  });
  test("requires public listing fields", () => {
    expect(() => validatePropertyPublication({ title: "x", address: {}, media: {} })).toThrow("Property cannot be published");
  });
});