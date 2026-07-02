export const swagger = {
  "/admin/workflow/{entityType}/{entityId}/logs": {
    get: {
      summary: "List workflow communication logs",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } },
        { name: "channel", in: "query", schema: { type: "string" } }
      ],
      responses: { 200: { description: "Workflow logs" } }
    },
    post: {
      summary: "Create workflow communication log",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 201: { description: "Workflow log created" } }
    }
  },
  "/admin/workflow/{entityType}/{entityId}/push": {
    post: {
      summary: "Queue or log an admin-triggered push notification",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 201: { description: "Push logged" } }
    }
  },
  "/admin/workflow/{entityType}/{entityId}/proofs": {
    post: {
      summary: "Upload proof file for workflow entity",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" }, summary: { type: "string" }, notes: { type: "string" } }, required: ["file"] } } } },
      responses: { 201: { description: "Proof uploaded and logged" } }
    }
  },
  "/admin/workflow/logs/{logId}": {
    delete: {
      summary: "Delete workflow communication log",
      parameters: [
        { name: "logId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Workflow log deleted" } }
    }
  }
};
