import { connectDatabase } from "../src/config/database.js";
import mongoose from "mongoose";

/**
 * Sparse unique indexes include explicit null values. Unset null contact fields
 * so multiple users can omit email/phone without E11000 collisions.
 * Only removes fields whose current value is null — never clears valid contacts.
 */
await connectDatabase();
const col = mongoose.connection.db.collection("users");

const fields = ["email", "mobileNumber", "phoneNormalized", "phone"];
const summary = {};

for (const field of fields) {
  const result = await col.updateMany(
    { [field]: null },
    { $unset: { [field]: "" } }
  );
  summary[field] = { matched: result.matchedCount, modified: result.modifiedCount };
}

console.log(JSON.stringify({ event: "cleanup_null_contact_fields", summary }, null, 2));
await mongoose.disconnect();
