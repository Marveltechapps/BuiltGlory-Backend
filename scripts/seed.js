import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Admin } from "../src/modules/admins/model.js";
import { makeReferenceId } from "../src/shared/id.js";

const email = process.env.SEED_ADMIN_EMAIL || "admin@builtglory.com";
const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

try {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await Admin.findOne({ email });
  if (!existing) {
    await Admin.create({ referenceId: makeReferenceId("admins"), name: "BuiltGlory Admin", email, role: "super_admin", permissions: ["*"], passwordHash, isActive: true });
    console.log(`Seeded admin ${email}`);
  } else {
    existing.name = existing.name || "BuiltGlory Admin";
    existing.role = "super_admin";
    existing.permissions = ["*"];
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await existing.save();
    console.log(`Updated admin ${email}`);
  }
} finally {
  await disconnectDatabase();
}
