import {
  NOTIFICATION_CODES,
  NOTIFICATION_DEEP_LINKS,
  buildCanonicalNotificationFields,
  buildNotificationDedupeKey,
  isMasterDeepLink,
  normalizeNotificationType,
  resolveAudienceDeepLink,
  resolveScreenCompact,
  resolveScreenKey
} from "../constants/notificationCatalog.js";

describe("notificationCatalog", () => {
  test("normalizes notification type codes", () => {
    expect(normalizeNotificationType("N01")).toBe("N-01");
    expect(normalizeNotificationType("n-5")).toBe("N-05");
    expect(normalizeNotificationType("N-08")).toBe("N-08");
  });

  test("maps buyer deep links per Master Document", () => {
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N01, "buyer")).toBe("P-08");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N02, "buyer")).toBe("P-08");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N03, "buyer")).toBe("B-12");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N05, "buyer")).toBe("B-13");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N06, "buyer")).toBe("B-14");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N07, "buyer")).toBe("B-15");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N08, "buyer")).toBe("B-16");
  });

  test("maps seller deep links per Master Document", () => {
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N02, "seller")).toBe("P-05");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N04, "seller")).toBe("SL-12");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N05, "seller")).toBe("SL-14");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N06, "seller")).toBe("SL-11");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N07, "seller")).toBe("SL-15");
    expect(resolveAudienceDeepLink(NOTIFICATION_CODES.N08, "seller")).toBe("SL-16");
  });

  test("exposes full deep link table", () => {
    expect(NOTIFICATION_DEEP_LINKS["N-01"]).toEqual({ buyer: "P-08" });
    expect(NOTIFICATION_DEEP_LINKS["N-05"]).toEqual({ buyer: "B-13", seller: "SL-14" });
  });

  test("resolves compact screen codes and navigation keys", () => {
    expect(resolveScreenCompact("B-12")).toBe("B12");
    expect(resolveScreenKey("B-12")).toBe("visitCalendar");
    expect(resolveScreenCompact("SL-14")).toBe("SL14");
    expect(resolveScreenKey("SL-14")).toBe("dealConfirmed");
  });

  test("builds canonical payload fields", () => {
    const canonical = buildCanonicalNotificationFields({
      notificationType: "N-06",
      audience: "buyer",
      entityId: "507f1f77bcf86cd799439011",
      entityType: "sales_deal",
      title: "Documents Ready",
      body: "Sale deed is ready.",
      image: "https://cdn.example.com/cover.jpg"
    });

    expect(canonical).toMatchObject({
      notificationType: "N-06",
      audience: "buyer",
      entityId: "507f1f77bcf86cd799439011",
      entityType: "sales_deal",
      deepLink: "B-14",
      title: "Documents Ready",
      body: "Sale deed is ready.",
      image: "https://cdn.example.com/cover.jpg",
      screen: "B14",
      screenKey: "documentsShared"
    });
    expect(canonical.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("detects master deep link codes", () => {
    expect(isMasterDeepLink("B-12")).toBe(true);
    expect(isMasterDeepLink("visitCalendar")).toBe(false);
    expect(isMasterDeepLink("P-08 Enquiry Detail")).toBe(true);
  });

  test("builds stable dedupe keys", () => {
    expect(buildNotificationDedupeKey("N-03", "visit", "507f1f77bcf86cd799439011")).toBe(
      "N-03:visit:507f1f77bcf86cd799439011"
    );
  });
});
