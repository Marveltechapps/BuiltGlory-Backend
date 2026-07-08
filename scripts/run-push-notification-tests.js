import axios from "axios";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Notification } from "../src/modules/notifications/model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "..", "postman", "push-notification-test-data.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const baseUrl = seed.baseUrl;
const pushToken = "fcm_test_token_android_device_abcdefghijklmnopqrstuvwxyz123456";
const deviceId = `postman-device-${Date.now()}`;

const state = {
  customerToken: "",
  adminToken: "",
  customerUserId: seed.customerUserId,
  notificationId: "",
  enquiryId: seed.enquiryId || "",
  visitId: "",
  propertyId: seed.propertyId,
  listingId: seed.listingId,
  dealId: seed.dealId,
  acquisitionId: seed.acquisitionId
};

const results = [];
const http = axios.create({ validateStatus: () => true, timeout: 15000 });

const record = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
};

const expectStatus = (name, res, expected, extra = () => true) => {
  const ok = (Array.isArray(expected) ? expected : [expected]).includes(res.status) && extra(res);
  record(name, ok, ok ? `${res.status}` : `expected ${expected}, got ${res.status} ${JSON.stringify(res.data?.error || res.data).slice(0, 200)}`);
  return ok;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

const fetchOtpFromDb = async (requestId) => {
  await new Promise((r) => setTimeout(r, 500));
  const byRequest = await Notification.findOne({ event: "otp_sent", "payload.requestId": requestId }).sort({ createdAt: -1 });
  if (byRequest?.payload?.otp) return String(byRequest.payload.otp);
  const latest = await Notification.findOne({ event: "otp_sent", recipient: `91${seed.customerPhone}` }).sort({ createdAt: -1 });
  return latest?.payload?.otp ? String(latest.payload.otp) : null;
};

const run = async () => {
  console.log(`\nBuiltGlory Push Notification API Tests\nBase URL: ${baseUrl}\n`);

  let res = await http.get(`${baseUrl.replace("/api/v1", "")}/health`);
  record("Server health", res.status === 200, res.status === 200 ? "ok" : "server not reachable");
  if (res.status !== 200) throw new Error("Start the backend with: npm run dev");

  res = await http.post(`${baseUrl}/auth/admin/login`, {
    email: seed.adminEmail,
    password: seed.adminPassword
  });
  if (expectStatus("Login Admin", res, 200, (r) => r.data?.data?.accessToken)) {
    state.adminToken = res.data.data.accessToken;
  }

  res = await http.post(`${baseUrl}/auth/customer/otp/send`, {
    countryCode: "+91",
    phone: seed.customerPhone,
    deviceId,
    purpose: "login"
  });
  let otpRequestId = "";
  if (expectStatus("Send Customer OTP", res, 200, (r) => r.data?.data?.requestId)) {
    otpRequestId = res.data.data.requestId;
  }

  await connectDatabase();
  const otp = await fetchOtpFromDb(otpRequestId);
  await disconnectDatabase();
  if (!otp) {
    record("Resolve OTP from notifications", false, "OTP not found in DB — check SMS or notification queue");
  } else {
    record("Resolve OTP from notifications", true, `******`);
    res = await http.post(`${baseUrl}/auth/customer/otp/verify`, {
      requestId: otpRequestId,
      countryCode: "+91",
      phone: seed.customerPhone,
      otp,
      purpose: "login"
    });
    if (expectStatus("Login Customer", res, 200, (r) => r.data?.data?.accessToken)) {
      state.customerToken = res.data.data.accessToken;
      state.customerUserId = res.data.data.user?._id || state.customerUserId;
    }
  }

  if (!state.customerToken || !state.adminToken) {
    console.log("\nAuthentication failed — skipping dependent tests.");
    printSummary();
    process.exit(1);
  }

  res = await http.put(`${baseUrl}/me/push-token`, {
    token: pushToken,
    platform: "android",
    deviceId
  }, { headers: authHeader(state.customerToken) });
  expectStatus("Register Push Token", res, 200, (r) => r.data?.data?.registered === true || Array.isArray(r.data?.data?.pushDevices));

  res = await http.get(`${baseUrl}/me/notifications?page=1&limit=20`, { headers: authHeader(state.customerToken) });
  if (expectStatus("List My Notifications", res, 200, (r) => Array.isArray(r.data?.data))) {
    if (res.data.data[0]?._id) state.notificationId = res.data.data[0]._id;
  }

  res = await http.patch(`${baseUrl}/me/notifications/read`, { ids: [] }, { headers: authHeader(state.customerToken) });
  expectStatus("Mark All Notifications Read", res, 200);

  if (state.notificationId) {
    res = await http.patch(`${baseUrl}/me/notifications/${state.notificationId}/read`, {}, { headers: authHeader(state.customerToken) });
    expectStatus("Mark Notification Read", res, 200, (r) => r.data?.data?.isRead === true);
  } else {
    record("Mark Notification Read", true, "skipped — no notification id");
  }

  res = await http.post(`${baseUrl}/admin/notifications/push`, {
    userId: state.customerUserId,
    audience: "buyer",
    notificationType: "general",
    title: "Testing Push",
    message: "Push notification testing",
    listingId: state.listingId,
    enquiryId: state.enquiryId,
    dealId: state.dealId,
    propertyId: state.propertyId
  }, { headers: authHeader(state.adminToken) });
  if (expectStatus("Send Manual Push", res, 201, (r) => r.data?.data?.inApp && r.data?.data?.push)) {
    state.notificationId = res.data.data.inApp?._id || state.notificationId;
  }

  res = await http.get(`${baseUrl}/me/notifications?page=1&limit=20`, { headers: authHeader(state.customerToken) });
  if (res.status === 200 && Array.isArray(res.data?.data)) {
    const inApp = res.data.data.find((n) => n.channel === "in_app");
    if (inApp?._id) state.notificationId = inApp._id;
  }

  res = await http.get(`${baseUrl}/admin/notifications?page=1&limit=20`, { headers: authHeader(state.adminToken) });
  expectStatus("List Admin Notifications", res, 200, (r) => Array.isArray(r.data?.data));

  res = await http.post(`${baseUrl}/buy-enquiries`, {
    propertyId: state.propertyId,
    enquiryTypes: ["site_visit"],
    preferredContact: "phone",
    interestType: "schedule_visit",
    preferredVisitTime: "tomorrow_morning",
    additionalMessage: "Postman workflow test - buy enquiry"
  }, { headers: authHeader(state.customerToken) });
  if (expectStatus("Buy Workflow - Create Buy Enquiry", res, 201, (r) => r.data?.data?._id)) {
    state.enquiryId = res.data.data._id;
    if (res.data.data.propertyId) state.propertyId = res.data.data.propertyId;
  }

  res = await http.post(`${baseUrl}/sell-requests`, {
    propertyType: "apartment",
    propertyTitle: "Postman Runtime Listing",
    askingPrice: 5000000,
    negotiable: true,
    ownershipType: "freehold",
    possessionStatus: "ready_to_move",
    loanOnProperty: false,
    address: { city: "Bengaluru", state: "KA", pincode: "560001", locality: "Central" },
    photos: [
      "https://example.com/p1.jpg",
      "https://example.com/p2.jpg",
      "https://example.com/p3.jpg",
      "https://example.com/p4.jpg",
      "https://example.com/p5.jpg"
    ],
    status: "new"
  }, { headers: authHeader(state.customerToken) });
  if (expectStatus("Sell Workflow - Create Sell Request", res, 201, (r) => r.data?.data?._id)) {
    state.listingId = res.data.data._id;
  }

  if (state.listingId) {
    res = await http.post(`${baseUrl}/me/sell-requests/${state.listingId}/submit`, {}, { headers: authHeader(state.customerToken) });
    expectStatus("Sell Workflow - Submit Sell Request", res, 200);
  }

  if (state.propertyId && state.enquiryId) {
    res = await http.post(`${baseUrl}/visits`, {
      propertyId: state.propertyId,
      enquiryId: state.enquiryId,
      visitDate: "2026-07-15T10:00:00.000Z",
      visitTime: "10:00 AM",
      visitType: "physical"
    }, { headers: authHeader(state.customerToken) });
    if (expectStatus("Visit Scheduled - Schedule Visit", res, 201, (r) => r.data?.data?._id)) {
      state.visitId = res.data.data._id;
    }
  }

  if (state.visitId) {
    res = await http.patch(`${baseUrl}/visits/${state.visitId}/cancel`, {
      reason: "Postman workflow test - cancelling visit"
    }, { headers: authHeader(state.customerToken) });
    expectStatus("Visit Cancelled - Cancel Visit", res, 200, (r) => r.data?.data?.status === "cancelled");
  }

  if (state.dealId) {
    res = await http.patch(`${baseUrl}/admin/sales/deals/${state.dealId}/token-payment`, {
      tokenPaid: true,
      tokenAmount: 250000
    }, { headers: authHeader(state.adminToken) });
    expectStatus("Payment Completed - Confirm Token Payment", res, 200);
  }

  if (state.acquisitionId) {
    res = await http.patch(`${baseUrl}/admin/acquisitions/${state.acquisitionId}/stage`, {
      stage: "valuation",
      notes: "Postman workflow test - acquisition stage update",
      valuation: { amount: 4500000, notes: "Initial valuation from Postman test" }
    }, { headers: authHeader(state.adminToken) });
    expectStatus("Acquisition Updated - Update Acquisition Stage", res, 200, (r) => r.data?.data?.stage === "valuation");
  }

  if (state.enquiryId) {
    res = await http.post(`${baseUrl}/admin/workflow/buy_enquiry/${state.enquiryId}/push`, {
      userId: state.customerUserId,
      notificationId: "visit_scheduled",
      template: {
        title: "Visit Scheduled",
        body: "Your visit has been scheduled via workflow push endpoint.",
        deepLink: "visitCalendar"
      }
    }, { headers: authHeader(state.adminToken) });
    expectStatus("Workflow Push - Entity Communication Log", res, [200, 201]);
  }

  res = await http.get(`${baseUrl}/me/notifications`, { headers: { Authorization: "Bearer invalid.jwt.token" } });
  expectStatus("Negative - Invalid JWT", res, 401, (r) => r.data?.error?.code);

  res = await http.put(`${baseUrl}/me/push-token`, { platform: "android" }, { headers: authHeader(state.customerToken) });
  expectStatus("Negative - Missing Push Token", res, [400, 422], (r) => r.data?.error?.code === "VALIDATION_ERROR");

  res = await http.patch(`${baseUrl}/me/notifications/000000000000000000000000/read`, {}, { headers: authHeader(state.customerToken) });
  expectStatus("Negative - Invalid Notification ID", res, 404, (r) => r.data?.error?.code === "NOT_FOUND");

  res = await http.post(`${baseUrl}/admin/notifications/push`, {
    audience: "buyer",
    notificationType: "general"
  }, { headers: authHeader(state.adminToken) });
  expectStatus("Negative - Invalid Admin Push Payload", res, [400, 422], (r) => r.data?.error?.code === "VALIDATION_ERROR");

  res = await http.put(`${baseUrl}/me/push-token`, {
    token: pushToken,
    platform: "android",
    deviceId
  }, { headers: authHeader(state.customerToken) });
  expectStatus("Negative - Duplicate Push Token Registration", res, 200);

  if (state.notificationId) {
    res = await http.delete(`${baseUrl}/me/notifications/${state.notificationId}`, {
      headers: authHeader(state.customerToken),
      data: {}
    });
    expectStatus("Delete Notification", res, 200, (r) => r.data?.data?.deleted === true);
  }

  res = await http.delete(`${baseUrl}/me/push-token`, {
    headers: authHeader(state.customerToken),
    data: { token: pushToken }
  });
  expectStatus("Remove Push Token", res, 200, (r) => r.data?.data?.removed === true);

  printSummary();
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
};

const printSummary = () => {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n--- Summary: ${passed}/${results.length} passed, ${failed} failed ---`);
  if (failed) {
    console.log("\nFailed tests:");
    results.filter((r) => !r.pass).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
