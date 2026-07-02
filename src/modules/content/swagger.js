export const swagger = {
  "/content": {
    get: {
      tags: ["Content"],
      summary: "List published app content",
      parameters: [
        { in: "query", name: "section", schema: { type: "string" } },
        { in: "query", name: "category", schema: { type: "string" } },
        { in: "query", name: "search", schema: { type: "string" } },
        { in: "query", name: "limit", schema: { type: "integer" } }
      ],
      responses: { 200: { description: "Published content items" } }
    }
  },
  "/content/{slug}": {
    get: {
      tags: ["Content"],
      summary: "Get one published content item by slug",
      parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Published content item" }, 404: { description: "Content not found" } }
    }
  },
  "/admin/content": {
    get: {
      tags: ["Admin Content"],
      summary: "List CMS content items",
      responses: { 200: { description: "Content items" } }
    },
    post: {
      tags: ["Admin Content"],
      summary: "Create CMS content item",
      responses: { 201: { description: "Content item created" } }
    }
  },
  "/admin/content/reorder": {
    patch: {
      tags: ["Admin Content"],
      summary: "Reorder CMS content items",
      responses: { 200: { description: "Reordered content items" } }
    }
  },
  "/admin/content/{contentId}": {
    patch: {
      tags: ["Admin Content"],
      summary: "Update CMS content item",
      parameters: [{ in: "path", name: "contentId", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Content item updated" } }
    },
    delete: {
      tags: ["Admin Content"],
      summary: "Archive CMS content item",
      parameters: [{ in: "path", name: "contentId", required: true, schema: { type: "string" } }],
      responses: { 204: { description: "Content item archived" } }
    }
  }
};
