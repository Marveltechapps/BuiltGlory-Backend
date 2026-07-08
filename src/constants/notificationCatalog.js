/**
 * BuiltGlory Master Document Part 8 — Notification Map (Deep Links).
 * Canonical N-01..N-08 codes, audiences, and deep-link screen IDs.
 */

export const NOTIFICATION_CODES = {
  N01: "N-01",
  N02: "N-02",
  N03: "N-03",
  N04: "N-04",
  N05: "N-05",
  N06: "N-06",
  N07: "N-07",
  N08: "N-08"
};

/** Audience-aware deep link targets from the Master Document. */
export const NOTIFICATION_DEEP_LINKS = {
  [NOTIFICATION_CODES.N01]: { buyer: "P-08", seller: null },
  [NOTIFICATION_CODES.N02]: { buyer: "P-08", seller: "P-05" },
  [NOTIFICATION_CODES.N03]: { buyer: "B-12", seller: null },
  [NOTIFICATION_CODES.N04]: { buyer: null, seller: "SL-12" },
  [NOTIFICATION_CODES.N05]: { buyer: "B-13", seller: "SL-14" },
  [NOTIFICATION_CODES.N06]: { buyer: "B-14", seller: "SL-11" },
  [NOTIFICATION_CODES.N07]: { buyer: "B-15", seller: "SL-15" },
  [NOTIFICATION_CODES.N08]: { buyer: "B-16", seller: "SL-16" }
};

/** Compact screen codes used in FCM `screen` (legacy mobile resolver). */
export const SCREEN_COMPACT = {
  "P-08": "P08",
  "P-05": "P05",
  "B-12": "B12",
  "B-13": "B13",
  "B-14": "B14",
  "B-15": "B15",
  "B-15A": "B15A",
  "B-16": "B16",
  "SL-11": "SL11",
  "SL-12": "SL12",
  "SL-14": "SL14",
  "SL-15": "SL15",
  "SL-16": "SL16",
  "SL-17": "SL17",
  "SL-18": "SL18",
  "SL-09": "SL09",
  "SL-10": "SL10"
};

/** Screen key → React Navigation route key in Customer-App. */
export const SCREEN_KEY_BY_DEEP_LINK = {
  "P-08": "enquiryDetail",
  "P-05": "listingDetail",
  "B-12": "visitCalendar",
  "B-13": "enquiryDetail",
  "B-14": "documentsShared",
  "B-15": "payment",
  "B-15A": "paymentFailure",
  "B-16": "registrationDetails",
  "SL-11": "reupload",
  "SL-12": "offer",
  "SL-14": "dealConfirmed",
  "SL-15": "paymentSchedule",
  "SL-16": "sellRegistration",
  "SL-17": "dealComplete",
  "SL-18": "rejectedListing",
  "SL-09": "sellerDashboard",
  "SL-10": "verificationStatus"
};

export const DEFAULT_MESSAGES = {
  [NOTIFICATION_CODES.N01]: {
    title: "Enquiry Received",
    body: "Your enquiry has been received. Our team will contact you within 24 hours."
  },
  [NOTIFICATION_CODES.N02]: {
    title: "Executive Call",
    body: "A Builtglory executive will call you shortly."
  },
  [NOTIFICATION_CODES.N03]: {
    title: "Visit Scheduled",
    body: "Your visit has been scheduled. Tap to view details."
  },
  [NOTIFICATION_CODES.N04]: {
    title: "Offer Received",
    body: "Builtglory has sent you an offer. Valid for 48 hours. Tap to view."
  },
  [NOTIFICATION_CODES.N05]: {
    title: "Deal Confirmed",
    body: "Your deal has been confirmed. Tap to view next steps."
  },
  [NOTIFICATION_CODES.N06]: {
    buyer: {
      title: "Documents Ready",
      body: "Documents are ready."
    },
    seller: {
      title: "Re-upload Required",
      body: "Action required: re-upload documents."
    }
  },
  [NOTIFICATION_CODES.N07]: {
    buyer: {
      title: "Payment Update",
      body: "Complete your token payment."
    },
    seller: {
      title: "Payment Schedule",
      body: "View your payment schedule."
    }
  },
  [NOTIFICATION_CODES.N08]: {
    title: "Registration Confirmed",
    body: "Your registration appointment is confirmed. Tap to view details."
  }
};

export const resolveAudienceDeepLink = (notificationType, audience = "buyer") => {
  const code = String(notificationType || "").toUpperCase().replace("_", "-");
  const normalized = code.startsWith("N-") ? code : code.length === 3 && code.startsWith("N") ? `N-0${code.slice(1)}` : notificationType;
  const entry = NOTIFICATION_DEEP_LINKS[normalized] || NOTIFICATION_DEEP_LINKS[notificationType];
  if (!entry) return null;
  const role = audience === "seller" ? "seller" : "buyer";
  return entry[role] || entry.buyer || entry.seller || null;
};

export const resolveScreenKey = (deepLink) => {
  if (!deepLink) return "notifications";
  if (SCREEN_KEY_BY_DEEP_LINK[deepLink]) return SCREEN_KEY_BY_DEEP_LINK[deepLink];
  const compact = String(deepLink).replace(/[-\s]/g, "").toUpperCase();
  const match = Object.entries(SCREEN_COMPACT).find(([, value]) => value === compact);
  if (match) return SCREEN_KEY_BY_DEEP_LINK[match[0]] || compact;
  return deepLink;
};

export const resolveScreenCompact = (deepLink) => {
  if (!deepLink) return "";
  if (SCREEN_COMPACT[deepLink]) return SCREEN_COMPACT[deepLink];
  return String(deepLink).replace(/[-\s]/g, "").toUpperCase();
};

export const resolveDefaultCopy = (notificationType, audience = "buyer") => {
  const entry = DEFAULT_MESSAGES[notificationType];
  if (!entry) return { title: "BuiltGlory", body: "You have a new notification." };
  if (entry.buyer || entry.seller) {
    return entry[audience === "seller" ? "seller" : "buyer"] || entry.buyer || entry.seller;
  }
  return entry;
};

/**
 * Builds the canonical Master Document notification payload fields.
 * All values are serializable; FCM data requires strings later.
 */
export const buildCanonicalNotificationFields = ({
  notificationType,
  audience = "buyer",
  entityId = "",
  entityType = "",
  deepLink,
  title,
  body,
  image = "",
  createdAt,
  screen,
  screenKey
} = {}) => {
  const resolvedDeepLink = deepLink || resolveAudienceDeepLink(notificationType, audience) || "";
  const defaults = resolveDefaultCopy(notificationType, audience);
  const resolvedScreen = screen || resolveScreenCompact(resolvedDeepLink);
  const resolvedScreenKey = screenKey || resolveScreenKey(resolvedDeepLink);
  return {
    notificationType: notificationType || "",
    entityId: entityId ? String(entityId) : "",
    entityType: entityType ? String(entityType) : "",
    deepLink: resolvedDeepLink || resolvedScreenKey || "",
    title: title || defaults.title,
    body: body || defaults.body,
    image: image ? String(image) : "",
    createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
    screen: resolvedScreen,
    screenKey: resolvedScreenKey,
    audience
  };
};
