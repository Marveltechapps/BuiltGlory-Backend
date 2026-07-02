export const swagger = {
  "/admin/settings": {
    get: {
      tags: ["Admin Settings"],
      summary: "Get organization, SLA, alert, notification, display, and Tools settings",
      responses: { 200: { description: "Admin settings" } }
    },
    patch: {
      tags: ["Admin Settings"],
      summary: "Update organization, SLA, alert, notification, display, and Tools settings",
      responses: { 200: { description: "Updated admin settings" } }
    }
  }
};
