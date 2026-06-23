export const swagger = {
  "/admin/overview": {
    get: {
      tags: ["Reports"],
      summary: "Dashboard overview",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "KPI cards, schedule, recent activities, and pipeline counts" } }
    }
  },
  "/admin/reports/summary": {
    get: {
      tags: ["Reports"],
      summary: "Reports summary",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } }
      ],
      responses: { 200: { description: "Aggregated report metrics" } }
    }
  },
  "/admin/reports/export": {
    post: {
      tags: ["Reports"],
      summary: "Create report export",
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: "Queued report export request" } }
    }
  }
};
