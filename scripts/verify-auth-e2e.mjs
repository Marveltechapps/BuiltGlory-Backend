import { connectDatabase } from "../src/config/database.js";
import { service } from "../src/modules/users/service.js";
import { User } from "../src/modules/users/model.js";
import { makeReferenceId } from "../src/shared/id.js";
import { sendCustomerOtp, verifyCustomerOtp } from "../src/modules/auth/service.js";
import mongoose from "mongoose";

await connectDatabase();

const phoneA = "9222200001";
const phoneB = "9222200002";
await User.deleteMany({ mobileNumber: { $in: [phoneA, phoneB] } });

console.log("--- OTP send (log mode) ---");
const otpSend = await sendCustomerOtp({ countryCode: "+91", phone: phoneA, purpose: "login", ip: "127.0.0.1" });
console.log(JSON.stringify({
  requestId: otpSend.requestId,
  deliveryMode: otpSend.deliveryMode,
  hasDebugOtp: Boolean(otpSend.debugOtp),
  debugOtpLen: otpSend.debugOtp?.length || 0
}));

console.log("--- OTP verify ---");
const session = await verifyCustomerOtp({
  requestId: otpSend.requestId,
  countryCode: "+91",
  phone: phoneA,
  otp: otpSend.debugOtp,
  purpose: "login",
  ip: "127.0.0.1"
});
console.log(JSON.stringify({
  hasAccessToken: Boolean(session.accessToken),
  userId: String(session.user?._id || ""),
  phone: session.user?.phone,
  name: session.user?.name || null
}));

console.log("--- profile save name only (phone login path) ---");
const saved = await service.update(
  String(session.user._id),
  { name: "Phone Login User" },
  { type: "customer", id: session.user._id },
  { ip: "127.0.0.1", headers: {} }
);
console.log(JSON.stringify({ name: saved.name, email: saved.email ?? null, mobileNumber: saved.mobileNumber }));

console.log("--- second user profile save with email:null must succeed via $unset ---");
const userB = await User.create({
  referenceId: makeReferenceId("users"),
  phone: `+91 ${phoneB}`,
  phoneNormalized: `91${phoneB}`,
  mobileNumber: phoneB,
  isVerified: true,
  role: "buyer",
  userType: "resident"
});
const savedB = await service.update(
  String(userB._id),
  { name: "Second User", email: null },
  { type: "customer", id: userB._id },
  { ip: "127.0.0.1", headers: {} }
);
console.log(JSON.stringify({
  name: savedB.name,
  emailExists: Object.prototype.hasOwnProperty.call(
    typeof savedB.toObject === "function" ? savedB.toObject() : savedB,
    "email"
  ),
  email: savedB.email ?? null
}));

await User.deleteMany({ mobileNumber: { $in: [phoneA, phoneB] } });
await mongoose.disconnect();
console.log("E2E_AUTH_FLOW_OK");
