import { env } from "../config/env.js";

const DEFAULT_SUPPORT_PHONE_DISPLAY = "+91 8667769670";
const DEFAULT_WHATSAPP_DIGITS = "918667769670";
const DEFAULT_SUPPORT_EMAIL = "support@builtglory.com";

export const phoneDigits = (phone) => String(phone || "").replace(/\D/g, "");

export const COMPANY_SUPPORT_PHONE_DISPLAY =
  env.COMPANY_SUPPORT_PHONE?.trim() || DEFAULT_SUPPORT_PHONE_DISPLAY;

export const COMPANY_SUPPORT_PHONE_E164 = `+${phoneDigits(COMPANY_SUPPORT_PHONE_DISPLAY)}`;

export const COMPANY_WHATSAPP_DIGITS =
  env.COMPANY_WHATSAPP_NUMBER?.trim() || phoneDigits(COMPANY_SUPPORT_PHONE_DISPLAY) || DEFAULT_WHATSAPP_DIGITS;

export const COMPANY_WHATSAPP_URL = `https://wa.me/${COMPANY_WHATSAPP_DIGITS}`;

export const COMPANY_TEL_URL = `tel:${COMPANY_SUPPORT_PHONE_E164}`;

export const COMPANY_SUPPORT_EMAIL =
  env.COMPANY_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;

export const COMPANY_SUPPORT_WHATSAPP_MESSAGE =
  "Hi BuiltGlory team, I need support regarding ";

export const companyContactPublic = () => ({
  supportPhone: COMPANY_SUPPORT_PHONE_DISPLAY,
  supportPhoneE164: COMPANY_SUPPORT_PHONE_E164,
  supportEmail: COMPANY_SUPPORT_EMAIL,
  whatsappNumber: COMPANY_WHATSAPP_DIGITS,
  whatsappUrl: COMPANY_WHATSAPP_URL,
  telUrl: COMPANY_TEL_URL,
  supportWhatsAppMessage: COMPANY_SUPPORT_WHATSAPP_MESSAGE,
});
