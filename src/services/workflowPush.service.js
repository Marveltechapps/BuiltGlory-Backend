import {
  NOTIFICATION_CODES,
  NOTIFICATION_DEEP_LINKS,
  buildCanonicalNotificationFields,
  resolveAudienceDeepLink,
  resolveScreenCompact,
  resolveScreenKey,
  resolveDefaultCopy
} from "../constants/notificationCatalog.js";

const idOf = (value) => (value?._id ? String(value._id) : value ? String(value) : "");

const titleCase = (value) =>
  String(value || "")
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const propertyLabel = (doc) =>
  doc.propertySnapshot?.title || doc.propertyTitle || doc.propertySnapshot?.location || "your property";

/**
 * Lifecycle → Master Document N-01..N-08 mapping.
 * audience: buyer | seller (affects deep link for dual-audience types).
 */
const WORKFLOW_NOTIFICATIONS = {
  buyEnquiries: {
    created: {
      type: NOTIFICATION_CODES.N01,
      audience: "buyer",
      entityType: "buy_enquiry",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N01).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N01).body
    },
    responded: {
      type: NOTIFICATION_CODES.N02,
      audience: "buyer",
      entityType: "buy_enquiry",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N02).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N02).body
    },
    visit_scheduled: {
      type: NOTIFICATION_CODES.N03,
      audience: "buyer",
      entityType: "buy_enquiry",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N03).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N03).body
    },
    negotiating: {
      type: NOTIFICATION_CODES.N02,
      audience: "buyer",
      entityType: "buy_enquiry",
      title: "Enquiry Update",
      message: (doc) => `Negotiation is in progress for ${propertyLabel(doc)}.`
    },
    closed: {
      type: NOTIFICATION_CODES.N08,
      audience: "buyer",
      entityType: "buy_enquiry",
      title: "Enquiry Closed",
      message: (doc) => `Your enquiry for ${propertyLabel(doc)} has been closed.`,
      deepLink: "P-08"
    }
  },
  visits: {
    created: {
      type: NOTIFICATION_CODES.N03,
      audience: "buyer",
      entityType: "visit",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N03).title,
      message: (doc) =>
        `Your visit has been scheduled${doc.visitDate ? ` for ${new Date(doc.visitDate).toLocaleDateString("en-IN")}` : ""}. Tap to view details.`
    },
    confirmed: {
      type: NOTIFICATION_CODES.N03,
      audience: "buyer",
      entityType: "visit",
      title: "Visit Confirmed",
      message: (doc) =>
        `Your visit is confirmed${doc.visitDate ? ` for ${new Date(doc.visitDate).toLocaleDateString("en-IN")}` : ""}. Tap to view details.`
    },
    rescheduled: {
      type: NOTIFICATION_CODES.N03,
      audience: "buyer",
      entityType: "visit",
      title: "Visit Rescheduled",
      message: () => "Your visit has been rescheduled. Tap to view details."
    },
    cancelled: {
      type: NOTIFICATION_CODES.N03,
      audience: "buyer",
      entityType: "visit",
      title: "Visit Cancelled",
      message: () => "Your visit was cancelled. You can schedule a new visit anytime.",
      deepLink: "B-12"
    }
  },
  sellRequests: {
    created: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "sell_request",
      title: "Listing Submitted",
      message: (doc) => `Your listing "${doc.propertyTitle || "property"}" has been submitted for review.`,
      deepLink: "P-05"
    },
    under_review: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "sell_request",
      title: "Document Verification",
      message: (doc) => `We are verifying documents for "${doc.propertyTitle || "your listing"}".`,
      deepLink: "P-05"
    },
    accepted: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "sell_request",
      title: "Listing Accepted",
      message: (doc) => `Your listing "${doc.propertyTitle || "property"}" has been accepted.`,
      deepLink: "P-05"
    },
    changes_requested: {
      type: NOTIFICATION_CODES.N06,
      audience: "seller",
      entityType: "sell_request",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N06, "seller").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N06, "seller").body
    },
    approved: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "sell_request",
      title: "Listing Approved",
      message: (doc) => `Your listing "${doc.propertyTitle || "property"}" is now live.`,
      deepLink: "P-05"
    },
    active: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "sell_request",
      title: "Listing Active",
      message: (doc) => `Your listing "${doc.propertyTitle || "property"}" is active on BuiltGlory.`,
      deepLink: "P-05"
    },
    negotiating: {
      type: NOTIFICATION_CODES.N04,
      audience: "seller",
      entityType: "sell_request",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N04).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N04).body
    },
    rejected: {
      type: NOTIFICATION_CODES.N06,
      audience: "seller",
      entityType: "sell_request",
      title: "Listing Needs Changes",
      message: (doc) => `Your listing "${doc.propertyTitle || "property"}" needs changes.`,
      deepLink: "SL-11"
    },
    sold: {
      type: NOTIFICATION_CODES.N08,
      audience: "seller",
      entityType: "sell_request",
      title: "Deal Completed",
      message: (doc) => `Congratulations! The deal for "${doc.propertyTitle || "your property"}" is complete.`,
      deepLink: "SL-16"
    }
  },
  acquisitions: {
    pending_review: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "acquisition",
      title: "Listing Under Review",
      message: (doc) => `"${doc.propertyTitle || "Your listing"}" is under review.`,
      deepLink: "P-05"
    },
    site_inspection: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "acquisition",
      title: "Site Inspection",
      message: (doc) => `Site inspection is scheduled for "${doc.propertyTitle || "your property"}".`,
      deepLink: "P-05"
    },
    valuation: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "acquisition",
      title: "Valuation In Progress",
      message: (doc) => `Valuation is in progress for "${doc.propertyTitle || "your property"}".`,
      deepLink: "P-05"
    },
    negotiation: {
      type: NOTIFICATION_CODES.N04,
      audience: "seller",
      entityType: "acquisition",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N04).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N04).body
    },
    token_to_seller: {
      type: NOTIFICATION_CODES.N05,
      audience: "seller",
      entityType: "acquisition",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N05).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N05).body
    },
    documentation: {
      type: NOTIFICATION_CODES.N06,
      audience: "seller",
      entityType: "acquisition",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N06, "seller").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N06, "seller").body
    },
    seller_payout: {
      type: NOTIFICATION_CODES.N07,
      audience: "seller",
      entityType: "acquisition",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N07, "seller").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N07, "seller").body
    },
    acquired: {
      type: NOTIFICATION_CODES.N08,
      audience: "seller",
      entityType: "acquisition",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N08).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N08).body
    },
    rejected: {
      type: NOTIFICATION_CODES.N06,
      audience: "seller",
      entityType: "acquisition",
      title: "Listing Rejected",
      message: (doc) => `"${doc.propertyTitle || "Your listing"}" was rejected.`,
      deepLink: "SL-11"
    },
    on_hold: {
      type: NOTIFICATION_CODES.N02,
      audience: "seller",
      entityType: "acquisition",
      title: "Listing On Hold",
      message: (doc) => `"${doc.propertyTitle || "Your listing"}" has been placed on hold.`,
      deepLink: "P-05"
    }
  },
  salesDeals: {
    active_leads: {
      type: NOTIFICATION_CODES.N02,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N02).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N02).body
    },
    site_visits: {
      type: NOTIFICATION_CODES.N03,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N03).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N03).body
    },
    negotiation: {
      type: NOTIFICATION_CODES.N02,
      audience: "buyer",
      entityType: "sales_deal",
      title: "Deal Negotiation",
      message: (doc) => `Negotiation is in progress for ${propertyLabel(doc)}.`
    },
    token_payment: {
      type: NOTIFICATION_CODES.N05,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N05).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N05).body
    },
    full_payment: {
      type: NOTIFICATION_CODES.N07,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N07, "buyer").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N07, "buyer").body
    },
    stage_payment: {
      type: NOTIFICATION_CODES.N07,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N07, "buyer").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N07, "buyer").body
    },
    documentation: {
      type: NOTIFICATION_CODES.N06,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N06, "buyer").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N06, "buyer").body
    },
    closed: {
      type: NOTIFICATION_CODES.N08,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N08).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N08).body
    },
    lost: {
      type: NOTIFICATION_CODES.N02,
      audience: "buyer",
      entityType: "sales_deal",
      title: "Deal Update",
      message: (doc) => `Your deal for ${propertyLabel(doc)} was marked as lost.`
    },
    re_engagement: {
      type: NOTIFICATION_CODES.N02,
      audience: "buyer",
      entityType: "sales_deal",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N02).title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N02).body
    },
    interior_design: {
      type: NOTIFICATION_CODES.N07,
      audience: "buyer",
      entityType: "sales_deal",
      title: "Interior Design Update",
      message: (doc) => `Interior design stage update for ${propertyLabel(doc)}.`
    }
  },
  payments: {
    created: {
      type: NOTIFICATION_CODES.N07,
      audience: "buyer",
      entityType: "payment",
      title: resolveDefaultCopy(NOTIFICATION_CODES.N07, "buyer").title,
      message: () => resolveDefaultCopy(NOTIFICATION_CODES.N07, "buyer").body
    },
    paid: {
      type: NOTIFICATION_CODES.N07,
      audience: "buyer",
      entityType: "payment",
      title: "Payment Received",
      message: () => "Your payment has been received."
    },
    failed: {
      type: NOTIFICATION_CODES.N07,
      audience: "buyer",
      entityType: "payment",
      title: "Payment Failed",
      message: () => "Your payment could not be processed. Please try again.",
      deepLink: "B-15A"
    }
  }
};

export const resolveWorkflowNotificationKey = (collection, action, to) => {
  if (action === "created") return { collection, key: "created" };
  if (action === "transition" && to) return { collection, key: to };
  return null;
};

const entityIdFor = (collection, doc) => {
  if (collection === "buyEnquiries" || collection === "visits" || collection === "salesDeals" || collection === "sellRequests" || collection === "acquisitions" || collection === "payments") {
    return idOf(doc._id);
  }
  return idOf(doc._id);
};

const enrichWorkflowPayload = (config, doc, collection, resolvedKey) => {
  const audience = config.audience || "buyer";
  const notificationType = config.type;
  const deepLink =
    config.deepLink || resolveAudienceDeepLink(notificationType, audience) || "";
  const message = typeof config.message === "function" ? config.message(doc) : config.message;
  const canonical = buildCanonicalNotificationFields({
    notificationType,
    audience,
    entityId: entityIdFor(collection, doc),
    entityType: config.entityType || "",
    deepLink,
    title: config.title,
    body: message,
    image: doc.propertySnapshot?.coverImage || doc.coverImage || doc.image || "",
    screen: resolveScreenCompact(deepLink),
    screenKey: resolveScreenKey(deepLink)
  });

  return {
    event: `${collection}_${resolvedKey}`,
    notificationType: canonical.notificationType,
    title: canonical.title,
    message: canonical.body,
    screen: canonical.screen,
    screenKey: canonical.screenKey,
    deepLink: canonical.deepLink,
    entityId: canonical.entityId,
    entityType: canonical.entityType,
    image: canonical.image,
    createdAt: canonical.createdAt,
    audience: canonical.audience,
    listingId: idOf(doc.sellRequestId || (collection === "sellRequests" ? doc._id : "")),
    sellRequestId: idOf(doc.sellRequestId || (collection === "sellRequests" ? doc._id : "")),
    enquiryId: idOf(doc.sourceEnquiryId || doc.enquiryId || (collection === "buyEnquiries" ? doc._id : "")),
    dealId: idOf(collection === "salesDeals" ? doc._id : doc.dealId),
    propertyId: idOf(doc.propertyId),
    userId: idOf(doc.userId || doc.buyerId || doc.sellerId),
    dedupeKey: `${collection}:${idOf(doc._id)}:${resolvedKey}`
  };
};

export const buildWorkflowNotification = ({ collection, action, doc, to }) => {
  const resolved = resolveWorkflowNotificationKey(collection, action, to);
  if (!resolved) return null;

  const config = WORKFLOW_NOTIFICATIONS[resolved.collection]?.[resolved.key];
  if (!config) {
    const fallbackEvent = `${collection.replace(/s$/, "")}_${resolved.key}`;
    const canonical = buildCanonicalNotificationFields({
      notificationType: titleCase(resolved.key).toUpperCase().replace(/\s+/g, "_"),
      audience: "buyer",
      entityId: idOf(doc._id),
      entityType: collection,
      title: titleCase(resolved.key),
      body: `Your ${titleCase(collection)} status changed to ${titleCase(resolved.key)}.`,
      deepLink: "P-08"
    });
    return {
      event: fallbackEvent,
      ...canonical,
      message: canonical.body,
      listingId: idOf(doc.sellRequestId),
      sellRequestId: idOf(doc.sellRequestId),
      enquiryId: idOf(doc.sourceEnquiryId || doc.enquiryId || (collection === "buyEnquiries" ? doc._id : "")),
      dealId: idOf(collection === "salesDeals" ? doc._id : doc.dealId),
      propertyId: idOf(doc.propertyId),
      userId: idOf(doc.userId || doc.buyerId || doc.sellerId),
      dedupeKey: `${collection}:${idOf(doc._id)}:${resolved.key}`
    };
  }

  return enrichWorkflowPayload(config, doc, collection, resolved.key);
};

export const buildManualNotificationPayload = ({
  notificationType,
  title,
  message,
  screen,
  listingId,
  enquiryId,
  dealId,
  propertyId,
  screenKey,
  audience = "buyer",
  entityId = "",
  entityType = "",
  image = "",
  deepLink
}) => {
  const resolvedDeepLink =
    deepLink ||
    resolveAudienceDeepLink(notificationType, audience) ||
    screen ||
    screenKey ||
    "";
  const canonical = buildCanonicalNotificationFields({
    notificationType: notificationType || "MANUAL",
    audience,
    entityId: entityId || listingId || enquiryId || dealId || propertyId || "",
    entityType,
    deepLink: resolvedDeepLink,
    title,
    body: message,
    image,
    screen: screen || resolveScreenCompact(resolvedDeepLink),
    screenKey: screenKey || resolveScreenKey(resolvedDeepLink)
  });

  return {
    event: "admin_manual_push",
    ...canonical,
    message: canonical.body,
    listingId: listingId || "",
    sellRequestId: listingId || "",
    enquiryId: enquiryId || "",
    dealId: dealId || "",
    propertyId: propertyId || "",
    dedupeKey: `manual:${notificationType || "push"}:${Date.now()}`
  };
};

/** Map dashboard N-codes / legacy labels → catalog deep links for admin push. */
export const resolveDashboardNotificationTarget = ({
  notificationId,
  audience = "buyer",
  deepLink
} = {}) => {
  const raw = String(notificationId || "").trim().toUpperCase();
  const digits = raw.replace(/\D/g, "");
  const normalized = Object.values(NOTIFICATION_CODES).includes(notificationId)
    ? notificationId
    : digits.length
      ? `N-${digits.padStart(2, "0")}`
      : null;

  if (normalized && NOTIFICATION_DEEP_LINKS[normalized]) {
    const explicitLink = deepLink && /^[A-Z]{1,2}-?\d/i.test(String(deepLink).trim())
      ? String(deepLink).trim().replace(/^([A-Za-z]+)[- ]?(\d+[A-Za-z]?)/i, (_, a, b) => `${a.toUpperCase()}-${b.toUpperCase()}`)
      : null;
    const resolvedLink = explicitLink || resolveAudienceDeepLink(normalized, audience);
    return {
      notificationType: normalized,
      deepLink: resolvedLink,
      screen: resolveScreenCompact(resolvedLink),
      screenKey: resolveScreenKey(resolvedLink)
    };
  }

  if (deepLink) {
    return {
      notificationType: notificationId || "MANUAL",
      deepLink,
      screen: resolveScreenCompact(deepLink),
      screenKey: resolveScreenKey(deepLink)
    };
  }

  return {
    notificationType: notificationId || "MANUAL",
    deepLink: "",
    screen: "",
    screenKey: ""
  };
};
