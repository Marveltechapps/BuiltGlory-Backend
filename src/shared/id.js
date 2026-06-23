const prefixes = {
  users: "USER", properties: "PROP", buyEnquiries: "BG-ENQ", sellRequests: "BG-SELL",
  acquisitions: "BG-ACQ", salesDeals: "BG-DEAL", visits: "BG-VST", callbacks: "BG-CB",
  payments: "PAY", supportTickets: "BG-TKT", interiorLeads: "BG-INT", notifications: "BG-NTF",
  documents: "DOC", auditLogs: "AUD", admins: "ADM", chatThreads: "BG-CHAT"
};
export const makeReferenceId = (collection) => {
  const prefix = prefixes[collection] || collection.toUpperCase();
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};