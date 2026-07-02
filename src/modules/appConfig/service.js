import { env } from "../../config/env.js";
import { service as adminSettingsService } from "../adminSettings/service.js";
import { DEFAULT_DASHBOARD_OPTIONS } from "./dashboardOptions.js";

const parseFeatureFlags = () => {
  try {
    const parsed = JSON.parse(env.APP_FEATURE_FLAGS || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
};

export const service = {
  async getPublicConfig() {
    const settings = await adminSettingsService.get().catch(() => null);
    const app = settings?.app || {};
    const payment = settings?.payment || {};
    return {
      versions: {
        current: env.APP_CURRENT_VERSION,
        minimumSupported: env.APP_MIN_SUPPORTED_VERSION,
        latest: env.APP_LATEST_VERSION
      },
      storeUrls: {
        ios: env.APP_IOS_STORE_URL || null,
        android: env.APP_ANDROID_STORE_URL || null
      },
      maintenance: {
        enabled: app.maintenance ?? Boolean(env.APP_MAINTENANCE_ENABLED),
        message: env.APP_MAINTENANCE_MESSAGE,
        expectedBackAt: env.APP_MAINTENANCE_BACK_AT || null
      },
      featureFlags: {
        ...parseFeatureFlags(),
        registration: app.registration,
        kycRequired: app.kycRequired,
        showPrices: app.showPrices,
        virtualTours: app.virtualTours,
        stagePayment: app.stagePayment,
        interior: app.interior
      },
      payment: {
        tokenAmount: payment.tokenAmount ?? 250000,
        escrow: payment.escrow || null
      },
      dashboardOptions: {
        ...DEFAULT_DASHBOARD_OPTIONS,
        ...(settings?.masterData || {})
      }
    };
  }
};
