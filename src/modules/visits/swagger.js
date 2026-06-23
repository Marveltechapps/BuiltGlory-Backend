export const swagger = {
  "/visits": { get: { tags: ["Visit"], summary: "List visits", responses: { 200: { description: "OK" } } }, post: { tags: ["Visit"], summary: "Create visits", responses: { 201: { description: "Created" } } } },
  "/visits/{id}": { get: { tags: ["Visit"], summary: "Get visits by id", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } }, patch: { tags: ["Visit"], summary: "Update visits", responses: { 200: { description: "OK" } } }, delete: { tags: ["Visit"], summary: "Soft delete visits", responses: { 204: { description: "Deleted" } } } }
};