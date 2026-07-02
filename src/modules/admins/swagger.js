export const swagger = {
  "/admin/admins": { get: { tags: ["Admin Access"], summary: "List admin operators", responses: { 200: { description: "OK" } } } },
  "/admin/admins/invite": { post: { tags: ["Admin Access"], summary: "Invite or create an admin operator", responses: { 201: { description: "Created" } } } },
  "/admin/admins/{id}": { patch: { tags: ["Admin Access"], summary: "Update an admin operator", responses: { 200: { description: "OK" } } }, delete: { tags: ["Admin Access"], summary: "Deactivate an admin operator", responses: { 200: { description: "Deactivated" } } } },
  "/admin/admins/{id}/permissions": { patch: { tags: ["Admin Access"], summary: "Update admin permissions", responses: { 200: { description: "OK" } } } },
  "/admin/admins/{id}/reset-password": { post: { tags: ["Admin Access"], summary: "Reset an admin password", responses: { 200: { description: "OK" } } } },
  "/admin/admins/{id}/suspend": { post: { tags: ["Admin Access"], summary: "Suspend or reactivate an admin operator", responses: { 200: { description: "OK" } } } },
  "/admin/sales-team": { get: { tags: ["Admin Access"], summary: "List active sales team members", responses: { 200: { description: "OK" } } }, post: { tags: ["Admin Access"], summary: "Create a sales team member", responses: { 201: { description: "Created" } } } },
  "/admin/sales-team/{id}": { patch: { tags: ["Admin Access"], summary: "Update a sales team member", responses: { 200: { description: "OK" } } }, delete: { tags: ["Admin Access"], summary: "Deactivate a sales team member", responses: { 200: { description: "Deactivated" } } } }
};