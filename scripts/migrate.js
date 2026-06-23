import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Admin } from "../src/modules/admins/model.js";
import { User } from "../src/modules/users/model.js";
import { Property } from "../src/modules/properties/model.js";

try {
  await connectDatabase();
  await Promise.all([Admin.syncIndexes(), User.syncIndexes(), Property.syncIndexes()]);
  console.log("Core indexes synchronized");
} finally {
  await disconnectDatabase();
}
