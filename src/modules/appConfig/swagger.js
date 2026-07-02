export const swagger = {
  "/app/config": {
    get: {
      tags: ["App Config"],
      summary: "Public app version, maintenance, store URL, and feature flag config",
      responses: { 200: { description: "Public app configuration" } }
    }
  }
};
