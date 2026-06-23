import bcrypt from "bcryptjs";
import { Admin } from "../modules/admins/model.js";
import * as authService from "../modules/auth/service.js";
import { service as userService } from "../modules/users/service.js";
import { service as sellRequestService } from "../modules/sellRequests/service.js";
import { service as acquisitionService } from "../modules/acquisitions/service.js";
import { models, seedAcquisition, seedCustomer, seedSellRequest, setupIntegrationDb } from "./helpers/integrationHarness.js";

setupIntegrationDb();

describe("business service branch coverage", () => {
  test("admin login, refresh rotation, reuse detection, and logout", async () => {
    const admin = await Admin.create({ name: "Login Admin", email: "login-admin@builtglory.test", passwordHash: await bcrypt.hash("Password123!", 10), role: "super_admin", permissions: ["properties.read"], isActive: true });
    const login = await authService.adminLogin({ email: admin.email, password: "Password123!", deviceId: "device", userAgent: "jest", ip: "127.0.0.1" });
    expect(login.accessToken).toBeTruthy();
    expect(login.refreshToken).toBeTruthy();

    const rotated = await authService.refresh({ refreshToken: login.refreshToken, deviceId: "device", userAgent: "jest", ip: "127.0.0.1" });
    expect(rotated.refreshToken).toBeTruthy();
    await expect(authService.refresh({ refreshToken: login.refreshToken })).rejects.toThrow("reuse");

    const loggedOut = await authService.logout({ refreshToken: rotated.refreshToken, accessToken: rotated.accessToken });
    expect(loggedOut.revoked).toBe(true);
  });

  test("user KYC/FEMA service validates required rules", async () => {
    const { user } = await seedCustomer({ userType: "nri", femaCompliance: { status: "not_checked" } });
    const actor = { type: "admin", id: user._id, role: "super_admin" };

    await expect(userService.updateKyc(user._id, { status: "verified", documentUpdates: [] }, actor, {})).rejects.toThrow("Required KYC");
    await expect(userService.updateFema(user._id, {}, actor, {})).rejects.toThrow("FEMA status");
    const fema = await userService.updateFema(user._id, { status: "compliant", notes: "Verified" }, actor, {});
    expect(fema.femaCompliance.status).toBe("compliant");

    const resident = await seedCustomer({ userType: "resident" });
    await expect(userService.updateFema(resident.user._id, { status: "compliant" }, actor, {})).rejects.toThrow("applies only");
  });

  test("sell request service validates submissions and customer update ownership", async () => {
    const { user } = await seedCustomer({ role: "seller" });
    const actor = { type: "customer", id: user._id };

    await expect(sellRequestService.create({ propertyTitle: "Incomplete" }, actor)).rejects.toThrow("incomplete");
    const draft = await sellRequestService.create({ status: "draft", isDraft: true, propertyTitle: "Draft" }, actor);
    expect(draft.status).toBe("draft");
    await expect(sellRequestService.transition(draft._id, "new", actor, {}, {})).rejects.toThrow("incomplete");

    const complete = await seedSellRequest(user._id, { status: "draft", ownershipType: "single_owner", photos: ["1", "2", "3", "4", "5"] });
    const submitted = await sellRequestService.transition(complete._id, "new", actor, {}, {});
    expect(submitted.status).toBe("new");
    await expect(sellRequestService.update(submitted._id, { propertyTitle: "Nope" }, actor, {})).rejects.toThrow("Seller can edit only");
  });

  test("acquisition service rejects invalid gates and converts acquired assets", async () => {
    const seller = await seedCustomer({ role: "seller" });
    const sellRequest = await seedSellRequest(seller.user._id, { status: "approved" });
    const actor = { type: "admin", id: seller.user._id, role: "super_admin" };
    const acquisition = await acquisitionService.create({ sellRequestId: sellRequest._id }, actor);
    expect(acquisition.stage).toBe("pending_review");
    await expect(acquisitionService.transition(acquisition._id, "valuation", actor, {}, {})).rejects.toThrow("Valuation");
    const inspected = await acquisitionService.transition(acquisition._id, "site_inspection", actor, {}, {});
    expect(inspected.stage).toBe("site_inspection");

    const acquired = await seedAcquisition(sellRequest._id, seller.user._id, { stage: "acquired", payout: { completed: true }, finalPurchasePrice: 800000, propertyDetails: { address: { city: "Bengaluru", locality: "Central", pincode: "560001" } } });
    const property = await acquisitionService.convertToProperty(acquired._id, { title: "Converted Property" }, actor, {});
    expect(property.title).toBe("Converted Property");
    expect(await models.AuditLog.countDocuments({ action: "acquisitions.converted_to_property" })).toBe(1);
  });
});
