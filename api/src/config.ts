/** Runtime configuration, sourced from the environment. */
export interface ApiConfig {
  port: number;
  /** Passed straight to `express.json({ limit })`, e.g. "1mb". */
  bodyLimit: string;
  /** Optional allowlist of export names to expose (`API_ALLOWLIST="gcd,parseFormula"`). */
  allowlist?: string[];
  /** Export names that are never exposed (`API_DENYLIST="..."`). */
  denylist?: string[];
  /** If set, only functions from these lib/core/* barrels are exposed (`API_GROUPS="structure,io"`). */
  groups?: string[];
  /**
   * Expose the flat POST /api/<name> routes (default true). Set
   * API_FLAT_ROUTES=false for grouped subpaths only (/api/<group>/<name>).
   */
  flatRoutes: boolean;
  /** Maximum number of calls accepted by POST /api/batch. */
  maxBatch: number;
}

function parseList(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    port: parsePositiveInt(env["PORT"], 3000),
    bodyLimit: env["API_BODY_LIMIT"] ?? "1mb",
    allowlist: parseList(env["API_ALLOWLIST"]),
    denylist: parseList(env["API_DENYLIST"]),
    groups: parseList(env["API_GROUPS"]),
    flatRoutes: parseBool(env["API_FLAT_ROUTES"], true),
    maxBatch: parsePositiveInt(env["API_MAX_BATCH"], 50),
  };
}
