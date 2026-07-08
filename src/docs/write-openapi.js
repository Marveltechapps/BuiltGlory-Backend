import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenapiSpec } from "./buildOpenapi.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const spec = buildOpenapiSpec();
const serialized = JSON.stringify(spec, null, 2);

writeFileSync(join(root, "openapi.json"), `${serialized}\n`);
writeFileSync(join(__dirname, "openapi.js"), `export const openapi = ${serialized};\n`);
console.log("Wrote openapi.json and src/docs/openapi.js");
