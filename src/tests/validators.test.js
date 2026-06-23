import { sendOtpValidator as authOtpValidator } from "../modules/auth/validator.js";
import { createValidator as propertyCreateValidator, listValidator as propertyListValidator } from "../modules/properties/validator.js";
import { createValidator as paymentCreateValidator } from "../modules/payments/validator.js";
import { createValidator as visitCreateValidator } from "../modules/visits/validator.js";
import { createValidator as supportCreateValidator } from "../modules/supportTickets/validator.js";
import { createValidator as callbackCreateValidator } from "../modules/callbacks/validator.js";

describe("representative request validators", () => {
  test("rejects invalid auth OTP payload", () => {
    const { error } = authOtpValidator.validate({ body: { phone: "123" } });
    expect(error).toBeTruthy();
  });

  test("accepts documented property create payload and rejects unknown keys", () => {
    const valid = propertyCreateValidator.validate({ body: { title: "Plot", type: "plot", price: 1000000, address: { city: "Bengaluru" } } });
    expect(valid.error).toBeFalsy();
    const invalid = propertyCreateValidator.validate({ body: { title: "Plot", type: "plot", price: 1000000, address: { city: "Bengaluru" }, $set: { status: "sold" } } });
    expect(invalid.error).toBeTruthy();
  });

  test("allows documented property filters", () => {
    const { error } = propertyListValidator.validate({ query: { city: "Bengaluru", minPrice: 1000, sort: "price_asc", page: 1, limit: 10 } });
    expect(error).toBeFalsy();
  });

  test("validates payment token creation", () => {
    const valid = paymentCreateValidator.validate({ body: { dealId: "0123456789abcdef01234567", amount: 1000, currency: "INR", idempotencyKey: "k1" } });
    expect(valid.error).toBeFalsy();
    const invalid = paymentCreateValidator.validate({ body: { dealId: "bad", amount: -1 } });
    expect(invalid.error).toBeTruthy();
  });

  test("validates visit scheduling", () => {
    const { error } = visitCreateValidator.validate({ body: { propertyId: "0123456789abcdef01234567", visitDate: new Date(Date.now() + 86400000).toISOString(), visitTime: "10:00", visitType: "physical" } });
    expect(error).toBeFalsy();
  });

  test("validates support and callback payloads", () => {
    expect(supportCreateValidator.validate({ body: { category: "technical", subject: "Issue", message: "Need help" } }).error).toBeFalsy();
    expect(callbackCreateValidator.validate({ body: { source: "help_support", preferredTime: new Date(Date.now() + 86400000).toISOString() } }).error).toBeFalsy();
  });
});
