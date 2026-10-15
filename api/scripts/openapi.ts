/**
 * Write the OpenAPI spec to api/openapi.json without starting a server.
 * Clients are generated from this file (see README).
 */
import { writeFileSync } from "node:fs";
import { createApp, VERSION } from "../src/app";

const spec = createApp().getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "matsci-parse API", version: VERSION },
});
writeFileSync(new URL("../openapi.json", import.meta.url), JSON.stringify(spec, null, 2) + "\n");
console.log(`wrote openapi.json (${Object.keys(spec.paths ?? {}).length} paths)`);
