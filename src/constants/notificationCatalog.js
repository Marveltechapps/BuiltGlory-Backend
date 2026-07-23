/**
 * Master Document Part 8 — canonical notification catalog.
 * Buyer: N-01→P-08, N-02→P-08, N-03→B-12, N-05→B-13, N-06→B-14, N-07→B-15, N-08→B-16
 * Seller: N-02→P-05, N-04→SL-12, N-05→SL-14, N-06→SL-11, N-07→SL-15, N-08→SL-16
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

/** Audience-specific deep link screen codes from the Master Document. */
export const NOTIFICATION_DEEP_LINKS = {
  [NOTIFICATION_CODES.N01]: { buyer: "P-08" },
  [NOTIFICATION_CODES.N02]: { buyer: "P-08", seller: "P-05" },
  [NOTIFICATION_CODES.N03]: { buyer: "B-12" },
  [NOTIFICATION_CODES.N04]: { seller: "SL-12", buyer: "SL-12" },
  [NOTIFICATION_CODES.N05]: { buyer: "B-13", seller: "SL-14" },
  [NOTIFICATION_CODES.N06]: { buyer: "B-14", seller: "SL-11" },
  [NOTIFICATION_CODES.N07]: { buyer: "B-15", seller: "SL-15" },
  [NOTIFICATION_CODES.N08]: { buyer: "B-16", seller: "SL-16" }
};

const DEEP_LINK_SCREEN_MAP = {
  "P-08": { screen: "P08", screenKey: "enquiryDetail" },
  "P-05": { screen: "P05", screenKey: "listingDetail" },
  "B-12": { screen: "B12", screenKey: "visitCalendar" },
  "B-12A": { screen: "B12A", screenKey: "rescheduleVisit" },
  "B-13": { screen: "B13", screenKey: "enquiryDetail" },
  "B-14": { screen: "B14", screenKey: "documentsShared" },
  "B-15": { screen: "B15", screenKey: "payment" },
  "B-15A": { screen: "B15A", screenKey: "paymentFailure" },
  "B-16": { screen: "B16", screenKey: "registrationDetails" },
  "SL-11": { screen: "SL11", screenKey: "reupload" },
  "SL-12": { screen: "SL12", screenKey: "offer" },
  "SL-14": { screen: "SL14", screenKey: "dealConfirmed" },
  "SL-15": { screen: "SL15", screenKey: "paymentSchedule" },
  "SL-16": { screen: "SL16", screenKey: "sellRegistration" },
  "SL-17": { screen: "SL17", screenKey: "dealComplete" },
  "SL-18": { screen: "SL18", screenKey: "verificationStatus" },
  home: { screen: "home", screenKey: "home" }
};

const DEFAULT_COPY = {
  [NOTIFICATION_CODES.N01]: {
    buyer: {
      title: "Enquiry Received",
      body: "Your enquiry has been received. Our team will contact you within 24 hours."
    }
  },
  [NOTIFICATION_CODES.N02]: {
    buyer: {
      title: "Executive Call",
      body: "A Builtglory executive will call you shortly."
    },
    seller: {
      title: "Listing Update",
      body: "A Builtglory executive will call you shortly about your listing."
    }
  },
  [NOTIFICATION_CODES.N03]: {
    buyer: {
      title: "Visit Scheduled",
      body: "Your visit has been scheduled. Tap to view details."
    }
  },
  [NOTIFICATION_CODES.N04]: {
    seller: {
      title: "Offer Received",
      body: "Builtglory has sent you an offer. Valid for 48 hours. Tap to view."
    },
    buyer: {
      title: "Offer Update",
      body: "There is an update on your offer. Tap to view details."
    }
  },
  [NOTIFICATION_CODES.N05]: {
    buyer: {
      title: "Deal Confirmed",
      body: "Your deal has been confirmed. Tap to view next steps."
    },
    seller: {
      title: "Deal Confirmed",
      body: "Your deal has been confirmed. Tap to view next steps."
    }
  },
  [NOTIFICATION_CODES.N06]: {
    buyer: {
      title: "Documents Ready",
      body: "Documents are ready. Tap to review."
    },
    seller: {
      title: "Re-upload Required",
      body: "Action required: re-upload documents for your listing."
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
    buyer: {
      title: "Registration Confirmed",
      body: "Your registration appointment is confirmed. Tap to view details."
    },
    seller: {
      title: "Registration Confirmed",
      body: "Your registration appointment is confirmed. Tap to view details."
    }
  }
};

const normalizeDeepLinkCode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (DEEP_LINK_SCREEN_MAP[raw]) return raw;
  const match = raw.match(/^([A-Za-z]+)[- ]?(\d+[A-Za-z]?)/i);
  if (match) return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
  return raw;
};

export const normalizeNotificationType = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  if (Object.values(NOTIFICATION_CODES).includes(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length) return `N-${digits.padStart(2, "0")}`;
  return raw;
};

export const resolveAudienceDeepLink = (notificationType, audience = "buyer") => {
  const normalized = normalizeNotificationType(notificationType);
  const entry = NOTIFICATION_DEEP_LINKS[normalized];
  if (!entry) return "";
  const preferSeller = audience === "seller";
  return (preferSeller && entry.seller) || entry.buyer || entry.seller || "";
};

export const resolveScreenCompact = (deepLink) => {
  const normalized = normalizeDeepLinkCode(deepLink);
  const mapped = DEEP_LINK_SCREEN_MAP[normalized];
  if (mapped?.screen) return mapped.screen;
  return normalized.replace(/[-\s]/g, "");
};

export const resolveScreenKey = (deepLink) => {
  const normalized = normalizeDeepLinkCode(deepLink);
  const mapped = DEEP_LINK_SCREEN_MAP[normalized];
  if (mapped?.screenKey) return mapped.screenKey;
  if (/^[a-z]/i.test(normalized) && !normalized.includes(" ")) return normalized;
  return resolveScreenCompact(normalized).toLowerCase();
};

export const resolveDefaultCopy = (notificationType, audience = "buyer") => {
  const normalized = normalizeNotificationType(notificationType);
  const entry = DEFAULT_COPY[normalized];
  if (!entry) {
    return {
      title: "BuiltGlory Update",
      body: "You have a new notification."
    };
  }
  return entry[audience] || entry.buyer || entry.seller || {
    title: "BuiltGlory Update",
    body: "You have a new notification."
  };
};

export const isMasterDeepLink = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const code = raw.split(/\s+/)[0];
  return /^(N-\d{2}|[A-Z]{1,3}-\d{1,2}[A-Z]?)$/i.test(code);
};

export const buildNotificationDedupeKey = (notificationType, entityType, entityId) => {
  const normalizedType = normalizeNotificationType(notificationType);
  const type = String(entityType || "").trim();
  const id = String(entityId || "").trim();
  if (!normalizedType || !type || !id) return "";
  return `${normalizedType}:${type}:${id}`;
};

export const buildCanonicalNotificationFields = ({
  notificationType = "",
  audience = "buyer",
  entityId = "",
  entityType = "",
  deepLink = "",
  title = "",
  body = "",
  image = "",
  createdAt,
  screen = "",
  screenKey = ""
} = {}) => {
  const normalizedType = normalizeNotificationType(notificationType);
  const resolvedDeepLink = deepLink || resolveAudienceDeepLink(normalizedType, audience) || "";
  const defaults = resolveDefaultCopy(normalizedType, audience);
  const finalTitle = title || defaults.title;
  const finalBody = body || defaults.body;
  const finalScreen = screen || resolveScreenCompact(resolvedDeepLink);
  const finalScreenKey = screenKey || resolveScreenKey(resolvedDeepLink);
  const createdAtIso = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();

  return {
    notificationType: normalizedType,
    audience,
    entityId: String(entityId || ""),
    entityType: String(entityType || ""),
    deepLink: resolvedDeepLink,
    title: finalTitle,
    body: finalBody,
    image: String(image || ""),
    createdAt: createdAtIso,
    screen: finalScreen,
    screenKey: finalScreenKey
  };
};
