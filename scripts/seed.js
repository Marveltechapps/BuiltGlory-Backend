import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Admin } from "../src/modules/admins/model.js";
import { makeReferenceId } from "../src/shared/id.js";

const email = process.env.SEED_ADMIN_EMAIL || "admin@builtglory.local";
const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

try {
  await connectDatabase();
  const existing = await Admin.findOne({ email });
  if (!existing) {
    await Admin.create({ referenceId: makeReferenceId("admins"), name: "BuiltGlory Admin", email, role: "super_admin", permissions: ["*"], passwordHash: await bcrypt.hash(password, 12), isActive: true });
    console.log(`Seeded admin ${email}`);
  } else {
    console.log(`Admin ${email} already exists`);
  }
} finally {
  await disconnectDatabase();
}
