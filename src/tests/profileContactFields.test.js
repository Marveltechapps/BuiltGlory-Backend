import { describe, expect, it } from "@jest/globals";

const DUPLICATE_FIELD_MESSAGES = {
  email: "This email is already registered to another account.",
  mobileNumber: "This phone number is already registered to another account.",
  phoneNormalized: "This phone number is already registered to another account.",
  referenceId: "A conflicting account reference already exists."
};

const isDuplicateKeyError = (err) => {
  const code = err?.code ?? err?.errorResponse?.code;
  if (code === 11000 || code === "11000" || code === "E11000") return true;
  if (err?.codeName === "DuplicateKey" || err?.errorResponse?.codeName === "DuplicateKey") return true;
  return typeof err?.message === "string" && /E11000|duplicate key/i.test(err.message);
};

const mapDuplicateKeyError = (err) => {
  if (!isDuplicateKeyError(err)) return null;
  const keyPattern = err.keyPattern || err.errorResponse?.keyPattern || {};
  const keyValue = err.keyValue || err.errorResponse?.keyValue || {};
  let field = Object.keys(keyPattern)[0] || Object.keys(keyValue)[0];
  if (!field && typeof err.message === "string") {
    const indexed = err.message.match(/index:\s*([a-zA-Z0-9_]+)/);
    if (indexed?.[1]) field = indexed[1].replace(/_1$/, "").replace(/_\d+$/, "");
  }
  field = field || "value";
  const value = keyValue[field];
  const message = (value === null || value === undefined)
    ? "Could not update profile contact fields. Please try again."
    : (DUPLICATE_FIELD_MESSAGES[field] || `A record with this ${field} already exists.`);
  return { statusCode: 409, code: "CONFLICT", message, details: [{ field, message, value }] };
};

const SPARSE_UNIQUE_CONTACT_FIELDS = ["email", "mobileNumber", "phoneNormalized", "phone"];

const buildProfileMongoUpdate = (data = {}) => {
  const $set = {};
  const $unset = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (SPARSE_UNIQUE_CONTACT_FIELDS.includes(key) && (value === null || value === "")) {
      $unset[key] = "";
      continue;
    }
    if (key === "email" && typeof value === "string") {
      $set.email = value.trim().toLowerCase();
      continue;
    }
    $set[key] = value;
  }
  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  return update;
};

describe("auth profile contact field fixes", () => {
  it("maps Mongo E11000 on email:null to conflict without treating it as a registered email", () => {
    const mapped = mapDuplicateKeyError({
      code: 11000,
      codeName: "DuplicateKey",
      message: "E11000 duplicate key error collection: test.users index: email_1 dup key: { email: null }",
      keyPattern: { email: 1 },
      keyValue: { email: null }
    });
    expect(mapped.statusCode).toBe(409);
    expect(mapped.code).toBe("CONFLICT");
    expect(mapped.message).toMatch(/contact fields/i);
  });

  it("maps findAndModify duplicate mobileNumber errors", () => {
    const mapped = mapDuplicateKeyError({
      code: 11000,
      message: "Plan executor error during findAndModify :: caused by :: E11000 duplicate key error collection: test.users index: mobileNumber_1 dup key: { mobileNumber: \"6385404182\" }",
      keyPattern: { mobileNumber: 1 },
      keyValue: { mobileNumber: "6385404182" }
    });
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).toMatch(/phone number/i);
  });

  it("unsets sparse unique nulls instead of setting null", () => {
    expect(buildProfileMongoUpdate({ name: "Ada", email: null })).toEqual({
      $set: { name: "Ada" },
      $unset: { email: "" }
    });
  });

  it("keeps valid phone fields in $set", () => {
    expect(buildProfileMongoUpdate({
      name: "Ada",
      mobileNumber: "9876543210",
      phoneNormalized: "919876543210",
      phone: "+91 9876543210"
    })).toEqual({
      $set: {
        name: "Ada",
        mobileNumber: "9876543210",
        phoneNormalized: "919876543210",
        phone: "+91 9876543210"
      }
    });
  });
});
