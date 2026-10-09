import { sendOtpValidator as authOtpValidator } from "../modules/auth/validator.js";
import { createValidator as propertyCreateValidator, listValidator as propertyListValidator } from "../modules/properties/validator.js";
import { createValidator as paymentCreateValidator } from "../modules/payments/validator.js";
import { createValidator as visitCreateValidator } from "../modules/visits/validator.js";
import { createValidator as supportCreateValidator } from "../modules/supportTickets/validator.js";
import { createValidator as callbackCreateValidator } from "../modules/callbacks/validator.js";
import { createValidator as sellCreateValidator, updateValidator as sellUpdateValidator } from "../modules/sellRequests/validator.js";
import { listValidator as acquisitionListValidator, updateValidator as acquisitionUpdateValidator, statusValidator as acquisitionStatusValidator } from "../modules/acquisitions/validator.js";
import { createValidator as salesCreateValidator, updateValidator as salesUpdateValidator, statusValidator as salesStatusValidator, listValidator as salesListValidator } from "../modules/salesDeals/validator.js";
import { collectSubmissionIssues } from "../modules/sellRequests/validationRules.js";

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
    const gateway = paymentCreateValidator.validate({ body: { dealId: "0123456789abcdef01234567", amount: 1000, method: "razorpay" } });
    expect(gateway.error).toBeTruthy();
  });

  test("validates visit scheduling", () => {
    const { error } = visitCreateValidator.validate({ body: { propertyId: "0123456789abcdef01234567", visitDate: new Date(Date.now() + 86400000).toISOString(), visitTime: "10:00", visitType: "physical" } });
    expect(error).toBeFalsy();
  });

  test("validates support and callback payloads", () => {
    expect(supportCreateValidator.validate({ body: { category: "technical", subject: "Issue", message: "Need help" } }).error).toBeFalsy();
    expect(callbackCreateValidator.validate({ body: { source: "help_support", preferredTime: new Date(Date.now() + 86400000).toISOString() } }).error).toBeFalsy();
  });

  test("validates sell request draft and update payloads by field type", () => {
    expect(sellCreateValidator.validate({ body: { propertyType: "apartment", isDraft: true, draftStep: 1 } }).error).toBeFalsy();
    expect(sellUpdateValidator.validate({ body: { propertyTitle: "Bright 3 BHK in Adyar", askingPrice: 8500000, address: { pincode: "600020", city: "Chennai" } } }).error).toBeFalsy();
    expect(sellUpdateValidator.validate({ body: { propertyTitle: "x".repeat(201), askingPrice: -1, address: { pincode: "12" } } }).error).toBeTruthy();
    expect(sellUpdateValidator.validate({ body: { askingPrice: 1000 } }).error).toBeTruthy();
    expect(sellUpdateValidator.validate({ body: { specifications: { poaHolderPhone: "123", virtualTourUrl: "ftp://bad" } } }).error).toBeTruthy();
    expect(sellUpdateValidator.validate({ body: { specifications: { builtUpArea: 1200, poaHolderPhone: "9876543210", virtualTourUrl: "https://tour.example.com" } } }).error).toBeFalsy();
  });

  test("collects type-specific sell submission issues", () => {
    const seller = { role: "seller" };
    const base = {
      propertyTitle: "Bright 3 BHK in Adyar",
      askingPrice: 8500000,
      ownershipType: "Freehold",
      address: { street: "Sunrise Heights", city: "Chennai", pincode: "600020" },
      photos: ["1", "2", "3", "4", "5"]
    };
    expect(collectSubmissionIssues({ ...base, propertyType: "apartment", specifications: { bhk: "3 BHK", builtUpArea: 1200 } }, seller)).toHaveLength(0);
    expect(collectSubmissionIssues({ ...base, propertyType: "plot", specifications: { plotArea: 2400 } }, seller)).toHaveLength(0);
    expect(collectSubmissionIssues({ ...base, propertyType: "apartment", specifications: {} }, seller).some((item) => item.field.includes("bhk"))).toBe(true);
    expect(collectSubmissionIssues({ ...base, propertyType: "plot", specifications: {} }, seller).some((item) => item.field.includes("plotArea"))).toBe(true);
    expect(collectSubmissionIssues({ ...base, propertyType: "apartment", loanOnProperty: true, specifications: { bhk: "2 BHK", builtUpArea: 900 } }, seller).some((item) => item.field.startsWith("loanDetails"))).toBe(true);
    expect(collectSubmissionIssues({ propertyTitle: "No" }, seller).length).toBeGreaterThan(0);
  });

  test("validates acquisition list, update, and stage payloads", () => {
    expect(acquisitionListValidator.validate({ query: { stage: "valuation", limit: 20, sort: "newest" } }).error).toBeFalsy();
    expect(acquisitionListValidator.validate({ query: { stage: "not_a_stage" } }).error).toBeTruthy();
    expect(acquisitionUpdateValidator.validate({ body: { priority: "high", builtgloryOffer: 500000 } }).error).toBeFalsy();
    expect(acquisitionUpdateValidator.validate({ body: { builtgloryOffer: -1, priority: "critical" } }).error).toBeTruthy();
    expect(acquisitionStatusValidator.validate({ body: { stage: "on_hold", onHoldReason: "Seller travelling" } }).error).toBeFalsy();
    expect(acquisitionStatusValidator.validate({ body: { stage: "closed" } }).error).toBeTruthy();
  });

  test("validates sales deal create, update, and stage payloads", () => {
    expect(salesListValidator.validate({ query: { stage: "token_payment", search: "aditya" } }).error).toBeFalsy();
    expect(salesCreateValidator.validate({ body: { buyerId: "0123456789abcdef01234567", propertyId: "0123456789abcdef01234567" } }).error).toBeFalsy();
    expect(salesCreateValidator.validate({ body: { buyerId: "bad" } }).error).toBeTruthy();
    expect(salesUpdateValidator.validate({ body: { agreedPrice: 1000000, tokenPaid: true } }).error).toBeFalsy();
    expect(salesUpdateValidator.validate({ body: { agreedPrice: 0 } }).error).toBeTruthy();
    expect(salesStatusValidator.validate({ body: { stage: "lost", lostReason: "No response" } }).error).toBeFalsy();
    expect(salesStatusValidator.validate({ body: { stage: "acquired" } }).error).toBeTruthy();
  });
});
