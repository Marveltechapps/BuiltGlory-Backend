export const swagger = {
  "/admins": { get: { tags: ["Admin"], summary: "List admins", responses: { 200: { description: "OK" } } }, post: { tags: ["Admin"], summary: "Create admins", responses: { 201: { description: "Created" } } } },
  "/admins/{id}": { get: { tags: ["Admin"], summary: "Get admins by id", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } }, patch: { tags: ["Admin"], summary: "Update admins", responses: { 200: { description: "OK" } } }, delete: { tags: ["Admin"], summary: "Soft delete admins", responses: { 204: { description: "Deleted" } } } }
};