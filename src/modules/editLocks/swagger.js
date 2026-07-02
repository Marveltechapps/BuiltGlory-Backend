export const swagger = {
  "/admin/workflow/{entityType}/{entityId}/lock": {
    get: {
      summary: "Read active edit lock",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Active lock or null" } }
    },
    post: {
      summary: "Claim or refresh edit lock",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Lock state" } }
    },
    delete: {
      summary: "Release edit lock",
      parameters: [
        { name: "entityType", in: "path", required: true, schema: { type: "string" } },
        { name: "entityId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Released" } }
    }
  }
};
