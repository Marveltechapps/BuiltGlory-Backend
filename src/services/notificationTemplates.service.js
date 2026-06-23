export const templates = {
  customer_otp: {
    sms: "Your BuiltGlory OTP is {{otp}}. It is valid for {{expiresInSeconds}} seconds.",
    whatsapp: "Your BuiltGlory OTP is {{otp}}. It is valid for {{expiresInSeconds}} seconds.",
    email: "Your BuiltGlory OTP is valid for {{expiresInSeconds}} seconds.",
    push: "Your BuiltGlory OTP is ready.",
    in_app: "Your BuiltGlory OTP was requested."
  },
  visit_reminder: {
    sms: "Reminder: your BuiltGlory visit is scheduled for {{visitDate}}.",
    whatsapp: "Reminder: your BuiltGlory visit is scheduled for {{visitDate}}.",
    email: "Reminder: your BuiltGlory visit is scheduled for {{visitDate}}.",
    push: "Visit reminder",
    in_app: "Your property visit is coming up."
  },
  deal_follow_up: {
    sms: "Your BuiltGlory deal is awaiting action.",
    whatsapp: "Your BuiltGlory deal is awaiting action.",
    email: "Your BuiltGlory deal is awaiting action.",
    push: "Deal follow-up",
    in_app: "Your deal needs follow-up."
  }
};

export const renderTemplate = ({ templateId, channel, payload = {} }) => {
  const template = templates[templateId]?.[channel] || templates[templateId]?.in_app || "";
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => String(payload[key.trim()] ?? ""));
};
