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
  "/admin/reports/sales/analytics": {
    get: {
      tags: ["Reports"],
      summary: "Sales analytics aggregates",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "propertyType", in: "query", schema: { type: "string" } }
      ],
      responses: { 200: { description: "Sales KPIs, monthly buckets, revenue mix, and property comparison rows" } }
    }
  },
  "/admin/reports/acquisition/analytics": {
    get: {
      tags: ["Reports"],
      summary: "Acquisition analytics aggregates",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "propertyType", in: "query", schema: { type: "string" } }
      ],
      responses: { 200: { description: "Acquisition KPIs, stage counts, and property-type mix" } }
    }
  },
  "/admin/reports/revenue/analytics": {
    get: {
      tags: ["Reports"],
      summary: "Revenue analytics aggregates",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "propertyType", in: "query", schema: { type: "string" } }
      ],
      responses: { 200: { description: "Revenue, cost, profit, monthly ledger, and payment aging aggregates" } }
    }
  },
  "/admin/reports/export": {
    post: {
      tags: ["Reports"],
      summary: "Create report export",
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: "Queued report export request" } }
    }
  },
  "/admin/reports/exports": {
    get: {
      tags: ["Reports"],
      summary: "List report export jobs",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Paginated export job history" } }
    }
  },
  "/admin/reports/exports/{id}": {
    get: {
      tags: ["Reports"],
      summary: "Get report export job status",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Export job status and metadata" } }
    }
  },
  "/admin/reports/exports/{id}/download-url": {
    get: {
      tags: ["Reports"],
      summary: "Create report export download URL",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Expiring download URL for completed export" } }
    }
  },
  "/admin/reports/exports/{id}/download": {
    get: {
      tags: ["Reports"],
      summary: "Download report export artifact",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "token", in: "query", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Generated export file" } }
    }
  }
};
