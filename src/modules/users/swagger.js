export const swagger = {
  "/me/account-deletion": {
    get: { tags: ["User"], summary: "Get current customer's account deletion status", responses: { 200: { description: "Account deletion status" } } },
    post: { tags: ["User"], summary: "Request current customer account deletion", responses: { 201: { description: "Account deletion requested" } } },
    delete: { tags: ["User"], summary: "Cancel current customer account deletion request", responses: { 200: { description: "Account deletion request cancelled" } } }
  },
  "/users": { get: { tags: ["User"], summary: "List users", responses: { 200: { description: "OK" } } }, post: { tags: ["User"], summary: "Create users", responses: { 201: { description: "Created" } } } },
  "/users/{id}": { get: { tags: ["User"], summary: "Get users by id", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } }, patch: { tags: ["User"], summary: "Update users", responses: { 200: { description: "OK" } } }, delete: { tags: ["User"], summary: "Soft delete users", responses: { 204: { description: "Deleted" } } } }
};