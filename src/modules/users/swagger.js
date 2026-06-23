export const swagger = {
  "/users": { get: { tags: ["User"], summary: "List users", responses: { 200: { description: "OK" } } }, post: { tags: ["User"], summary: "Create users", responses: { 201: { description: "Created" } } } },
  "/users/{id}": { get: { tags: ["User"], summary: "Get users by id", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } }, patch: { tags: ["User"], summary: "Update users", responses: { 200: { description: "OK" } } }, delete: { tags: ["User"], summary: "Soft delete users", responses: { 204: { description: "Deleted" } } } }
};