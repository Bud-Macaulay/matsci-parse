import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import type { LibraryModule } from "./discover.js";

/**
 * Entry point. The library build (`matsci-parse` -> `dist/index.js`, produced
 * by the existing `pnpm build`) is imported exactly once and its function
 * references are shared by every request, so the process stays persistent,
 * V8 can keep JIT-optimized code hot, and any in-memory state is preserved.
 */
const config = loadConfig();

let lib: LibraryModule;
try {
  lib = (await import("matsci-parse")) as LibraryModule;
} catch {
  console.error(
    'Failed to load the "matsci-parse" build. Run `pnpm build` from the repo root first.',
  );
  process.exit(1);
}

const { app, discovery } = createApp(lib, {
  bodyLimit: config.bodyLimit,
  maxBatch: config.maxBatch,
  allowlist: config.allowlist,
  denylist: config.denylist,
  groups: config.groups,
  flatRoutes: config.flatRoutes,
});

app.listen(config.port, () => {
  console.log(
    `matsci-api listening on :${config.port} ` +
      `(${discovery.functions.size} functions, ` +
      `${discovery.skippedNonFunctions.length} non-function exports skipped, ` +
      `${discovery.skippedClasses.length} classes skipped` +
      `${config.allowlist ? `, allowlist: ${config.allowlist.join(",")}` : ""}` +
      `${config.groups ? `, groups: ${config.groups.join(",")}` : ""}` +
      `${config.flatRoutes ? "" : ", grouped subpaths only (no flat routes)"})`,
  );
});
