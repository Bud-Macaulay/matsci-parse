/**
 * Discovery of callable library exports.
 *
 * The library module is inspected once at startup. Only top-level plain
 * functions become endpoints. Data objects, numbers, namespaces and class
 * constructors are skipped and reported, so nothing sensitive or
 * non-callable is exposed by accident.
 */

/** The library namespace object (`import * as lib from "matsci-parse"`). */
export type LibraryModule = Record<string, unknown>;

/** A callable library export. Sync and async functions are both supported. */
export type LibraryFunction = (...args: unknown[]) => unknown;

export interface DiscoverOptions {
  /** If set, only these export names are exposed. */
  allowlist?: string[];
  /** Export names that are never exposed, even if allowlisted. */
  denylist?: string[];
}

export interface DiscoveryResult {
  functions: Map<string, LibraryFunction>;
  skippedNonFunctions: string[];
  skippedClasses: string[];
  skippedFiltered: string[];
}

const VALID_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * True for `class` constructors. They look like functions via `typeof` but
 * must not be exposed as callable endpoints (and cannot be invoked without
 * `new`), so they are skipped during discovery.
 */
export function isClass(value: unknown): boolean {
  if (typeof value !== "function") return false;
  const source = Function.prototype.toString.call(value);
  return /^class[\s{]/.test(source);
}

export function discoverFunctions(
  mod: LibraryModule,
  opts: DiscoverOptions = {},
): DiscoveryResult {
  const allow = opts.allowlist ? new Set(opts.allowlist) : null;
  const deny = new Set(opts.denylist ?? []);
  const result: DiscoveryResult = {
    functions: new Map(),
    skippedNonFunctions: [],
    skippedClasses: [],
    skippedFiltered: [],
  };
  for (const [name, value] of Object.entries(mod)) {
    if (!VALID_NAME.test(name)) {
      result.skippedFiltered.push(name);
      continue;
    }
    if (typeof value !== "function") {
      result.skippedNonFunctions.push(name);
      continue;
    }
    if (isClass(value)) {
      result.skippedClasses.push(name);
      continue;
    }
    if (deny.has(name) || (allow !== null && !allow.has(name))) {
      result.skippedFiltered.push(name);
      continue;
    }
    result.functions.set(name, value as LibraryFunction);
  }
  return result;
}
